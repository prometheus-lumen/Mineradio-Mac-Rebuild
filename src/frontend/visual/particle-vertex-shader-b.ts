const PARTICLE_VERTEX_SHADER_B = `
      if (coverMask > 0.02) {
        vec2 coverUv = p / (coverR * 2.0) + 0.5;
        newCol = sampleNewCoverColor(coverUv);
        prevCol = samplePrevCoverColor(coverUv);
        coverColor = mix(prevCol, newCol, clamp(uColorMixT, 0.0, 1.0));
        if (hiResGuard > 0.001) {
          vec2 sx = vec2(0.0026, 0.0);
          vec2 sy = vec2(0.0, 0.0026);
          vec3 softNew = (sampleNewCoverColor(coverUv + sx) + sampleNewCoverColor(coverUv - sx) + sampleNewCoverColor(coverUv + sy) + sampleNewCoverColor(coverUv - sy)) * 0.25;
          vec3 softPrev = (samplePrevCoverColor(coverUv + sx) + samplePrevCoverColor(coverUv - sx) + samplePrevCoverColor(coverUv + sy) + samplePrevCoverColor(coverUv - sy)) * 0.25;
          coverColor = mix(coverColor, mix(softPrev, softNew, clamp(uColorMixT, 0.0, 1.0)), hiResGuard * 0.42);
        }
        vColor = mix(defaultColor, coverColor, uHasCover);
        float coverShade = 1.02 + 0.10 * (1.0 - smoothstep(0.0, coverR, d));
        vColor *= coverShade;
        vColor = mix(vColor, vec3(1.0), border * 0.54);
        pos.z = 0.040 + border * 0.026 * depthGuard + uBeat * 0.018 * beatGuard;
        maxRippleAmp = max(maxRippleAmp, border * 0.30 + bassDrive * 0.075 * beatGuard + uBeat * 0.075 * beatGuard);
      } else {
        float groove = 0.5 + 0.5 * sin((d - coverR) * mix(98.0, 58.0, hiResGuard));
        float fineGroove = 0.5 + 0.5 * sin((d - coverR) * mix(170.0, 92.0, hiResGuard) + aRand * 3.0);
        float tick = smoothstep(0.82, 0.995, hash11(floor((angle0 + PI) * 38.0) + floor(d * 72.0) * 2.1));
        vec3 vinyl = vec3(0.052, 0.054, 0.058) + vec3(0.052 * grooveGuard) * groove + vec3(0.026 * grooveGuard) * fineGroove;
        vinyl = mix(vinyl, coverColor * 0.32, 0.18 * (1.0 - vinylN));
        float whiteRing = max(border * 0.92, outerRim * 0.26);
        vColor = mix(vinyl, vec3(0.92, 0.94, 0.94), whiteRing);
        vColor = mix(vColor, vec3(1.0), tick * highDrive * (0.06 + border * 0.12) * grooveGuard);
        pos.z = groove * 0.010 * grooveGuard + border * 0.024 * depthGuard + bassDrive * vinylN * 0.016 * K * beatGuard + tick * highDrive * 0.010 * grooveGuard;
        maxRippleAmp = max(maxRippleAmp, border * 0.32 + outerRim * 0.12 + bassDrive * vinylN * 0.11 * beatGuard + tick * highDrive * 0.10 * grooveGuard + uBeat * vinylN * 0.08 * beatGuard);
      }
    }
  
    // ====================================================
    //  Preset 8: PARTICLE CLOCK — 秒级粒子时钟
    //  Canvas mask drives the digits; spare particles remain as fine star dust.
    // ====================================================
    else if (uPreset > 7.5) {
      float seed = hash11(aRand * 1777.0 + floor(aUv.x * 240.0) + floor(aUv.y * 180.0) * 3.1);
      float mask = texture2D(uClockTex, vec2(aUv.x, aUv.y)).r;
      float digit = smoothstep(0.035, 0.74, mask);
      float clockEdge = smoothstep(0.03, 0.18, mask) * (1.0 - smoothstep(0.78, 1.0, mask));
      float digitTwinkle = pow(0.5 + 0.5 * sin(t * (0.64 + seed * 0.82) + aRand * 16.0), 7.0);
      float dustTwinkle = pow(0.5 + 0.5 * sin(t * (0.38 + seed * 0.70) + aRand * 23.0), 6.0);
      float breath = sin(t * 0.52) * 0.5 + 0.5;
  
      vec3 textPos = vec3(
        (aUv.x - 0.5) * 10.15 + (seed - 0.5) * 0.022,
        (aUv.y - 0.5) * 2.74 + (hash11(aRand * 43.0) - 0.5) * 0.018,
        0.18 + clockEdge * 0.16 + digitTwinkle * 0.040 + breath * 0.018
      );
      textPos.x += sin(t * 0.18 + seed * 6.28) * 0.010;
      textPos.y += cos(t * 0.15 + seed * 5.31) * 0.008;
  
      float dustAngle = seed * PI * 2.0 + t * (0.010 + seed * 0.018);
      float dustRadius = mix(1.2, 12.4, pow(hash11(aRand * 307.0 + 5.0), 0.58));
      vec3 dustPos = vec3(
        cos(dustAngle) * dustRadius + (aUv.x - 0.5) * 9.2,
        sin(dustAngle * 0.78 + seed * 4.4) * dustRadius * 0.50 + (hash11(aRand * 79.0) - 0.5) * 4.2,
        mix(-15.5, 6.8, hash11(aRand * 601.0)) + sin(t * (0.05 + seed * 0.05) + seed * 9.0) * 0.38
      );
      pos = mix(dustPos, textPos, digit);
  
      vec3 ice = vec3(0.70, 0.92, 1.00);
      vec3 whiteHot = vec3(0.96, 1.00, 1.00);
      vec3 blueMist = vec3(0.34, 0.62, 0.88);
      vec2 clockColorUv = safeCoverUv(vec2(fract(aUv.x * 0.73 + 0.13), fract(aUv.y * 1.17 + 0.29)));
      vec3 clockCoverA = mix(samplePrevCoverColor(clockColorUv), sampleNewCoverColor(clockColorUv), clamp(uColorMixT, 0.0, 1.0));
      vec3 coverClock = mix(ice, mix(coverColor, clockCoverA, 0.58), clamp(uHasCover, 0.0, 1.0));
      float coverAvg = dot(coverClock, vec3(0.3333));
      coverClock = clamp(vec3(coverAvg) + (coverClock - vec3(coverAvg)) * 2.15, vec3(0.0), vec3(1.35));
      float coverLum = dot(coverClock, vec3(0.299, 0.587, 0.114));
      coverClock = mix(coverClock, whiteHot, clamp(0.24 - coverLum, 0.0, 0.24) * 1.25);
      coverClock = mix(coverClock, uTintColor, clamp(uTintStrength, 0.0, 1.0) * 0.50);
      vec3 dustCol = mix(blueMist, coverClock, 0.64 + seed * 0.24);
      dustCol = mix(dustCol, whiteHot, dustTwinkle * 0.18);
      vec3 digitCol = coverClock * (1.22 + mask * 0.34);
      digitCol = mix(digitCol, whiteHot, 0.10 + digitTwinkle * 0.09);
      digitCol = mix(digitCol, coverClock * 1.48 + vec3(0.10), clockEdge * 0.38);
      vColor = mix(dustCol, digitCol, digit);
      vAlpha = mix(0.022 + dustTwinkle * 0.18, 0.34 + mask * 0.78 + clockEdge * 0.18 + digitTwinkle * 0.08, digit);
      vAlpha *= 0.86 + breath * 0.10;
      maxRippleAmp = max(maxRippleAmp, digit * (0.16 + clockEdge * 0.32 + digitTwinkle * 0.10) + dustTwinkle * 0.040);
    }
  
    // ====================================================
    //  Preset 7: HEXAGRAM — 六芒星星阵
    //  Gold/cyan dotted triangles with circular orbital trails.
    // ====================================================
    else if (uPreset > 6.5) {
      float lane = aUv.y;
      float seed = hash11(aRand * 1447.0);
      float beatFlash = smoothstep(0.025, 0.68, uBeat);
      float bassFlash = smoothstep(0.08, 0.74, uBass);
      float highSpark = smoothstep(0.035, 0.48, uTreble);
      float flash = clamp(beatFlash * 0.76 + bassFlash * 0.30 + highSpark * 0.20 + uBurstAmt * 0.58, 0.0, 1.38);
      vec3 goldA = vec3(1.00, 0.82, 0.42);
      vec3 goldB = vec3(1.00, 0.94, 0.72);
      vec3 cyanA = vec3(0.34, 0.88, 1.00);
      vec3 cyanB = vec3(0.72, 1.00, 1.00);
  
      if (lane < 0.58) {
        float starLane = lane / 0.58;
        float triSet = step(0.5, starLane);
        float local = triSet < 0.5 ? starLane * 2.0 : (starLane - 0.5) * 2.0;
        float edgeId = floor(local * 3.0);
        float edgeT = fract(local * 3.0);
        float sideBand = floor(aUv.x * 9.0);
        float sideT = fract(aUv.x * 9.0);
        float triRot = triSet < 0.5 ? PI * 0.5 : -PI * 0.5;
        float edgeA = triRot + edgeId * PI * 2.0 / 3.0;
        float edgeB = triRot + (edgeId + 1.0) * PI * 2.0 / 3.0;
        float starR = 2.72 + bassFlash * 0.055 + sin(t * 0.42 + seed * 6.0) * 0.010;
        vec2 va = vec2(cos(edgeA), sin(edgeA)) * starR;
        vec2 vb = vec2(cos(edgeB), sin(edgeB)) * starR;
        vec2 base = mix(va, vb, edgeT);
        vec2 tangent = normalize(vb - va);
        vec2 normal = vec2(-tangent.y, tangent.x);
        float strand = (sideT - 0.5) * (0.030 + highSpark * 0.008);
        float shimmer = sin(edgeT * PI * 42.0 - t * (1.75 + seed * 0.46) + seed * 6.28);
        pos.xy = base + normal * (strand + shimmer * 0.0045) + tangent * ((seed - 0.5) * 0.012);
        pos.z = 0.18 + (seed - 0.5) * 0.20 + flash * 0.035;
        float vertexGlow = max(exp(-pow(edgeT / 0.022, 2.0)), exp(-pow((1.0 - edgeT) / 0.022, 2.0)));
        float midLineGlow = exp(-pow((edgeT - 0.5) / 0.030, 2.0)) * 0.32;
        float dotGate = smoothstep(0.05, 0.36, sideT) * (1.0 - smoothstep(0.64, 0.98, sideT));
        float dotted = 0.68 + pow(max(0.0, shimmer * 0.5 + 0.5), 6.0) * 0.32;
        vec3 edgeCol = mix(goldA, cyanA, smoothstep(-1.70, 1.70, pos.x + (triSet < 0.5 ? -0.28 : 0.34)));
        edgeCol = mix(edgeCol, goldB, vertexGlow * 0.54 + flash * 0.08);
        edgeCol = mix(edgeCol, cyanB, smoothstep(0.82, 1.00, pos.x / starR) * 0.36);
        vColor = edgeCol * (0.92 + dotted * 0.66 + vertexGlow * (2.10 + flash * 0.70) + midLineGlow);
        vAlpha = (0.36 + dotted * 0.42 + vertexGlow * 0.54 + midLineGlow * 0.16) * dotGate;
        maxRippleAmp = max(maxRippleAmp, vertexGlow * (0.60 + flash * 0.46) + dotted * highSpark * 0.10 + midLineGlow * 0.18);
      } else if (lane < 0.84) {
        float ringLane = (lane - 0.58) / 0.26;
        float ringId = floor(ringLane * 8.0);
        float ringLocal = fract(ringLane * 8.0);
        float theta = aUv.x * PI * 2.0 + t * (0.050 + ringId * 0.006) * (ringId < 4.0 ? 1.0 : -1.0);
        float r = 1.28 + ringId * 0.255 + ringLocal * 0.054 + sin(theta * 5.0 + t * 0.45 + seed * 4.0) * 0.008;
        float broken = smoothstep(0.18, 0.88, hash11(floor(aUv.x * (130.0 + ringId * 19.0)) + ringId * 41.3));
        float dash = pow(0.5 + 0.5 * sin(theta * (34.0 + ringId * 5.0) - t * (1.7 + ringId * 0.10)), 5.0);
        pos.xy = vec2(cos(theta), sin(theta)) * r;
        pos.z = -0.08 + ringId * 0.018 + (seed - 0.5) * 0.16;
        float cyanMix = smoothstep(0.06, 0.96, sin(theta + ringId * 0.44) * 0.5 + 0.5);
        vec3 ringCol = mix(goldA, cyanA, cyanMix);
        ringCol = mix(ringCol, goldB, dash * 0.25 + flash * 0.08);
        vColor = ringCol * (0.48 + dash * 0.82 + broken * 0.34 + flash * 0.16);
        vAlpha = (0.09 + dash * 0.32 + broken * 0.14) * (0.72 + highSpark * 0.18);
        maxRippleAmp = max(maxRippleAmp, dash * highSpark * 0.13 + flash * 0.11);
      } else if (lane < 0.955) {
        float q = (lane - 0.84) / 0.115;
        float theta = aUv.x * PI * 2.0 + sin(q * 6.0 + t * 0.22) * 0.16;
        float r = mix(3.15, 4.95, q) + snoise(vec3(theta * 0.45, q * 3.0, t * 0.045)) * 0.14;
        pos.xy = vec2(cos(theta), sin(theta * 0.97 + seed * 0.30)) * r;
        pos.z = -0.26 - q * 0.34 + (seed - 0.5) * 0.28;
        float waveDot = pow(0.5 + 0.5 * sin(theta * 42.0 + q * 16.0 - t * 1.25 + seed * 6.28), 4.0);
        vec3 outerCol = mix(goldA * 0.82, cyanA * 0.72, smoothstep(-0.60, 0.80, cos(theta - 0.40)));
        vColor = outerCol * (0.34 + waveDot * 0.50 + flash * 0.16);
        vAlpha = (0.055 + waveDot * 0.16) * (1.0 - smoothstep(0.84, 1.0, q));
        maxRippleAmp = max(maxRippleAmp, waveDot * 0.07 + flash * 0.08);
      } else {
        float q = (lane - 0.955) / 0.045;
        float dustSeed = hash11(seed * 991.0 + floor(aUv.x * 320.0));
        float angle = aUv.x * PI * 2.0 + t * (0.018 + dustSeed * 0.030);
        float r = mix(1.0, 5.3, pow(dustSeed, 0.68));
        pos = vec3(cos(angle) * r, sin(angle * 0.84 + dustSeed * 5.0) * r * 0.64, mix(-1.2, 0.65, q) + sin(t * 0.26 + dustSeed * 8.0) * 0.10);
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.62 + dustSeed * 1.2) + aRand * 19.0), 8.0);
        vAlpha = (0.015 + twinkle * 0.13 + flash * 0.045) * smoothstep(0.03, 0.56, q);
        vColor = mix(goldA, cyanA, dustSeed) * (0.36 + twinkle * 0.64 + flash * 0.18);
        maxRippleAmp = max(maxRippleAmp, twinkle * (0.08 + highSpark * 0.15) + flash * 0.08);
      }
    }
  
    // ====================================================
    //  Legacy laser branch disabled: preset 7 is now HEXAGRAM.
    // ====================================================
    else if (uPreset > 99.5) {
      float lane = aUv.y;
      float seed = hash11(aRand * 1201.0);
      float beatFlash = smoothstep(0.020, 0.62, uBeat);
      float bassFlash = smoothstep(0.10, 0.82, uBass);
      float highSpark = smoothstep(0.045, 0.48, uTreble);
      float flash = clamp(beatFlash * 0.92 + bassFlash * 0.34 + uBurstAmt * 0.70, 0.0, 1.45);
  
      if (lane < 0.76) {
        float beamCount = 18.0;
        float beamId = floor(aUv.x * beamCount);
        float beamLocal = fract(aUv.x * beamCount);
        float beamSeed = hash11(beamId * 17.13 + seed * 7.9);
        float strandCount = 5.0;
        float strandId = floor(beamLocal * strandCount);
        float strandLocal = fract(beamLocal * strandCount);
        float strandSeed = hash11(beamId * 41.7 + strandId * 9.3 + seed * 3.1);
        float rayT = clamp(lane / 0.76, 0.0, 1.0);
        float spread = pow(rayT, 0.88);
        float angle = beamId / beamCount * PI * 2.0
          + (strandId - 2.0) * (0.010 + flash * 0.006)
          + t * (0.034 + beamSeed * 0.050)
          + sin(t * 0.16 + beamSeed * 6.2831) * 0.075;
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 normal = vec2(-dir.y, dir.x);
        float cross = (strandLocal - 0.5) * (0.10 + spread * 0.16);
        float radius = mix(1.32, 18.5 + beamSeed * 4.8, spread);
        float rayNoise = snoise(vec3(rayT * 1.5, beamSeed * 3.4, t * 0.12));
        float bend = (sin(rayT * 10.0 - t * (1.4 + beamSeed) + strandSeed * 6.0) * 0.020 + rayNoise * 0.030) * rayT;
        pos.xy = dir * radius + normal * (cross + bend);
        pos.z = 0.92 + (beamSeed - 0.5) * (0.72 + rayT * 0.88) + flash * (0.14 - rayT * 0.06);
  
        float core = exp(-pow((strandLocal - 0.50) / 0.17, 2.0));
        float shaft = smoothstep(0.0, 0.11, rayT) * (1.0 - smoothstep(0.96, 1.0, rayT));
        float pulse = pow(0.5 + 0.5 * sin(rayT * 26.0 - t * 4.4 + beamSeed * 6.2), 7.0);
        float originFlare = 1.0 - smoothstep(0.00, 0.16, rayT);
        float strobeFloor = 0.34 + beamSeed * 0.34;
        float strobeRaw = 0.5 + 0.5 * sin(t * (2.6 + beamSeed * 5.2) + beamSeed * 11.0 + strandSeed * 2.4);
        float strobeGate = pow(max(0.0, (strobeRaw - strobeFloor) / max(0.001, 1.0 - strobeFloor)), 2.8);
        strobeGate = max(strobeGate, flash * (0.18 + beamSeed * 0.42));
        vec3 cA = mix(vec3(0.00, 1.00, 0.92), vec3(1.00, 0.10, 0.70), step(0.32, beamSeed));
        vec3 cB = mix(vec3(0.38, 0.70, 1.0), vec3(1.0, 0.82, 0.12), step(0.66, beamSeed));
        vec3 laserCol = mix(cA, cB, pulse * 0.58 + highSpark * 0.24);
        vColor = laserCol * (0.80 + strobeGate * (1.15 + core * 1.85 + flash * 1.65 + originFlare * 1.15 + highSpark * 0.72));
        vAlpha = (0.006 + core * 0.13 + originFlare * 0.035 + pulse * 0.035) * shaft * strobeGate * (0.26 + flash * 0.34);
        maxRippleAmp = max(maxRippleAmp, core * (0.34 + flash * 0.60) + originFlare * 0.18 + pulse * highSpark * 0.20);
      } else if (lane < 0.98) {
        float q = (lane - 0.76) / 0.22;
        float band = floor(aUv.x * 46.0);
        float row = floor(q * 22.0);
        float tile = fract(aUv.x * 46.0);
        float tileSeed = hash11(band * 29.7 + seed * 11.3);
        float theta = aUv.x * PI * 2.0 + t * (0.16 + bassFlash * 0.10);
        float phi = (q - 0.5) * PI * 0.86;
        float ballR = 1.18 + bassFlash * 0.08 + sin(t * 0.54 + tileSeed * 6.0) * 0.012;
        float mosaic = step(0.46, hash11(row * 19.3 + band * 3.1));
        float facet = pow(0.5 + 0.5 * sin(tile * PI * 2.0 + tileSeed * 5.0), 3.8);
        pos.x = cos(theta) * cos(phi) * ballR;
        pos.y = sin(phi) * ballR;
        pos.z = sin(theta) * cos(phi) * ballR + 1.04;
        float silhouette = pow(abs(cos(phi)), 0.70);
        float equatorShade = 1.0 - smoothstep(0.10, 0.46, abs(q - 0.5));
        float flare = pow(max(0.0, cos(theta - t * 0.26)), 13.0) * (0.40 + flash * 0.52);
        float cutLine = smoothstep(0.88, 0.99, fract(row * 0.37 + band * 0.19 + tileSeed));
        vec3 baseMirror = mix(vec3(0.42, 0.50, 0.56), vec3(0.96, 0.98, 0.94), mosaic);
        vec3 coolFacet = mix(baseMirror, vec3(0.70, 0.92, 1.0), facet * 0.34);
`;
