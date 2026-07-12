use serde_json::{json, Value};
use std::io::Cursor;
use symphonia::core::{
    audio::SampleBuffer,
    codecs::DecoderOptions,
    formats::FormatOptions,
    io::{MediaSourceStream, MediaSourceStreamOptions},
    meta::MetadataOptions,
    probe::Hint,
};

pub fn analyze(bytes: Vec<u8>, duration_hint: f64) -> Result<Value, String> {
    let source = MediaSourceStream::new(
        Box::new(Cursor::new(bytes)),
        MediaSourceStreamOptions::default(),
    );
    let probed = symphonia::default::get_probe()
        .format(
            &Hint::new(),
            source,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| e.to_string())?;
    let mut format = probed.format;
    let track = format.default_track().ok_or("AUDIO_TRACK_MISSING")?;
    let track_id = track.id;
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;
    let mut energies = Vec::<f32>::new();
    let mut frame_sum = 0.0f64;
    let mut frame_count = 0usize;
    let mut sample_rate = track.codec_params.sample_rate.unwrap_or(44_100);
    let hop = 1024usize;
    let mut decoded_samples = 0usize;
    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(symphonia::core::errors::Error::IoError(_)) => break,
            Err(error) => return Err(error.to_string()),
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
            Err(error) => return Err(error.to_string()),
        };
        sample_rate = decoded.spec().rate;
        let spec = *decoded.spec();
        let mut samples = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        samples.copy_interleaved_ref(decoded);
        let channels = spec.channels.count().max(1);
        for frame in samples.samples().chunks(channels) {
            let mono = frame.iter().map(|v| *v as f64).sum::<f64>() / channels as f64;
            frame_sum += mono * mono;
            frame_count += 1;
            decoded_samples += 1;
            if frame_count >= hop {
                energies.push((frame_sum / frame_count as f64).sqrt() as f32);
                frame_sum = 0.0;
                frame_count = 0;
            }
        }
    }
    if frame_count > 0 {
        energies.push((frame_sum / frame_count as f64).sqrt() as f32);
    }
    let hop_sec = hop as f64 / sample_rate as f64;
    let duration = if decoded_samples > 0 {
        decoded_samples as f64 / sample_rate as f64
    } else {
        duration_hint
    };
    Ok(build_map(
        &energies,
        hop_sec,
        duration,
        sample_rate,
        decoded_samples,
    ))
}

fn build_map(
    energy: &[f32],
    hop_sec: f64,
    duration: f64,
    sample_rate: u32,
    decoded_samples: usize,
) -> Value {
    if energy.len() < 20 {
        return json!({"kicks":[],"beats":[],"pulseBeats":[],"cameraBeats":[],"duration":duration,"visualBeatCount":0,"tempoSource":"podcast-dj-rust-empty","analyzedAt":unix_millis()});
    }
    let mut onsets = Vec::<(usize, f32)>::new();
    let window = (0.8 / hop_sec).round().max(8.0) as usize;
    let min_gap = (0.22 / hop_sec).round().max(2.0) as usize;
    let mut last = 0usize;
    for i in window..energy.len().saturating_sub(2) {
        let slice = &energy[i - window..i];
        let mean = slice.iter().copied().sum::<f32>() / slice.len() as f32;
        let variance = slice.iter().map(|v| (*v - mean).powi(2)).sum::<f32>() / slice.len() as f32;
        let onset = (energy[i] - energy[i.saturating_sub(2)] * 0.82).max(0.0);
        let threshold = variance.sqrt() * 1.35 + mean * 0.055;
        if onset > threshold && energy[i] >= energy[i - 1] && energy[i] >= energy[i + 1] {
            if i.saturating_sub(last) >= min_gap {
                onsets.push((i, onset));
                last = i;
            } else if let Some(previous) = onsets.last_mut() {
                if onset > previous.1 {
                    *previous = (i, onset);
                    last = i;
                }
            }
        }
    }
    let mut intervals = onsets
        .windows(2)
        .map(|pair| (pair[1].0 - pair[0].0) as f64 * hop_sec)
        .filter(|v| (0.25..=1.2).contains(v))
        .collect::<Vec<_>>();
    intervals.sort_by(|a, b| a.total_cmp(b));
    let mut step = intervals.get(intervals.len() / 2).copied().unwrap_or(0.5);
    while step < 0.34 {
        step *= 2.0;
    }
    while step > 0.82 {
        step *= 0.5;
    }
    let anchor = onsets.first().map(|v| v.0 as f64 * hop_sec).unwrap_or(0.0);
    let max_energy = energy.iter().copied().fold(0.0001f32, f32::max);
    let mut beats = Vec::new();
    let mut time = anchor;
    let mut index = 0usize;
    while time < duration {
        let frame = ((time / hop_sec).round() as usize).min(energy.len() - 1);
        let strength = (energy[frame] / max_energy).clamp(0.12, 1.0) as f64;
        let impact = (0.2 + strength * 0.8).min(1.0);
        beats.push(json!({"time":time,"strength":strength,"confidence":0.72,"impact":impact,"primary":true,"camera":true,"pulse":true,"tone":"podcast-dj-rust-grid","low":strength,"body":strength*0.32,"snap":strength*0.12,"mass":strength*0.82,"sharpness":0.08,"combo":if index%4==0 {"downbeat"} else {"push"},"step":step,"index":index,"dj":true,"grid":true,"kickOnly":true,"server":true}));
        index += 1;
        time += step;
    }
    let kicks = beats
        .iter()
        .filter_map(|b| b.get("time").cloned())
        .collect::<Vec<_>>();
    let pulse = beats.iter().map(|b| json!({"time":b.get("time"),"strength":b.get("strength"),"impact":b.get("impact"),"combo":b.get("combo"),"low":b.get("low"),"body":b.get("body"),"snap":b.get("snap"),"dj":true})).collect::<Vec<_>>();
    json!({"kicks":kicks,"beats":beats,"pulseBeats":pulse,"cameraBeats":beats,"gridStep":step,"sectionSteps":[step],"tempoSource":"podcast-dj-rust-offline","duration":duration,"visualBeatCount":index,"analyzedAt":unix_millis(),"debug":{"candidates":onsets.len(),"hopSec":hop_sec,"step":step},"decode":{"decodedSamples":decoded_samples,"sampleRate":sample_rate,"frames":energy.len(),"effectiveDurationSec":duration}})
}

fn unix_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
