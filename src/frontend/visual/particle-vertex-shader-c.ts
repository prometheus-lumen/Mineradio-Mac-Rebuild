const PARTICLE_VERTEX_SHADER_C = `
        vColor = coolFacet * (0.62 + silhouette * 0.62 + equatorShade * 0.18 + facet * 0.42 + flare * 1.45 + cutLine * 0.28 + highSpark * 0.18);
        vAlpha = (0.06 + mosaic * 0.03 + facet * 0.055 + flare * 0.04 + cutLine * 0.025) * (0.34 + flash * 0.08);
        maxRippleAmp = max(maxRippleAmp, 0.02 + flash * 0.035 + flare * 0.035);
      } else {
        float q = (lane - 0.98) / 0.02;
        float dustSeed = hash11(seed * 991.0 + floor(aUv.x * 260.0));
        float drift = fract(aUv.x + t * (0.006 + dustSeed * 0.018) + dustSeed * 0.73);
        float angle = drift * PI * 2.0 + t * (0.10 + dustSeed * 0.14);
        float r = mix(2.0, 12.8, pow(dustSeed, 0.62));
        pos = vec3(cos(angle) * r, sin(angle * 0.84 + dustSeed * 5.0) * r * 0.56, mix(-16.0, 4.0, q) + sin(t * 0.30 + dustSeed * 9.0));
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.72 + dustSeed * 1.4) + aRand * 20.0), 7.0);
        vAlpha = (0.012 + twinkle * 0.12 + flash * 0.045) * smoothstep(0.02, 0.42, q);
        vColor = mix(vec3(0.58, 0.92, 1.0), vec3(1.0, 0.74, 0.48), dustSeed) * (0.38 + twinkle * 0.54 + flash * 0.22);
        maxRippleAmp = max(maxRippleAmp, twinkle * (0.08 + highSpark * 0.18) + flash * 0.10);
      }
    }
  
    // ====================================================
    //  Preset 5: WALLPAPER PULSE
    //  Layered music-particle wallpaper: aurora ribbons, depth sparks,
    //  and cover-colored audio flow.
    // ====================================================
    else {
      float bassGlow = smoothstep(0.07, 0.78, uBass) * 0.34 + uBeat * 0.014;
      float midGlow = smoothstep(0.07, 0.62, uMid) * 0.42;
      float highGlow = smoothstep(0.04, 0.46, uTreble) * 0.46;
      float lane = aUv.y;
      float transition = clamp(uBurstAmt, 0.0, 1.0);
  
      if (lane < 0.80) {
        float laneWarp = snoise(vec3(aUv.x * 0.42, lane * 1.7, t * 0.026)) * 0.11 + (hash11(aRand * 73.1) - 0.5) * 0.045;
        float warpedLane = clamp(lane + laneWarp, 0.0, 0.80);
        float bandCoord = warpedLane / 0.80 * 5.65 + snoise(vec3(aUv.x * 0.82, lane * 2.25, t * 0.032)) * 0.62;
        float band = floor(bandCoord);
        float local = fract(bandCoord + hash11(band * 9.13 + aRand * 2.4) * 0.18);
        float bandN = clamp((band + 0.5) / 5.65, 0.0, 1.0);
        float seed = hash11(band * 19.17 + aRand * 31.0);
        float flow = fract(aUv.x + t * (0.0034 + bandN * 0.0038 + seed * 0.0022) + seed * 0.53);
        float arc = (flow - 0.5) * PI * (1.35 + bandN * 0.72 + seed * 0.24);
        float armCurve = sin(arc + bandN * 2.2 + seed * 5.3);
        float spiralRadius = 9.2 + bandN * 11.8 + seed * 6.0 + local * 2.9;
        float x = cos(arc * 0.72 + bandN * 0.92 + seed * 1.3) * spiralRadius + (flow - 0.5) * (13.5 + bandN * 9.5);
        float ribbonPhase = flow * PI * 2.0 * (0.55 + bandN * 0.24 + seed * 0.10) + t * (0.010 + bandN * 0.007) + seed * 5.7;
        float broadWave = sin(ribbonPhase) * 0.92;
        float fineWave = sin(ribbonPhase * (1.36 + seed * 0.62) - t * 0.044 + seed * 5.0) * 0.045;
        float yBase = (bandN - 0.5) * 13.2 + armCurve * (2.3 + bandN * 1.6) + (seed - 0.5) * 1.85 + snoise(vec3(bandN * 2.0, flow * 0.62, seed)) * 0.92;
        float ridgeCenter = 0.43 + (seed - 0.5) * 0.18;
        float ridge = exp(-pow((local - ridgeCenter) / (0.25 + seed * 0.04), 2.0));
        float softMask = smoothstep(0.010, 0.12, lane) * (1.0 - smoothstep(0.72, 0.81, lane));
        float ribbonNoise = snoise(vec3(flow * 1.18 + seed, bandN * 2.0, t * 0.018)) * 0.74;
        float zLayer = mix(-23.5, 15.5, bandN) + (seed - 0.5) * 6.0;
  
        pos.x = x + ribbonNoise * 1.40 + sin(t * 0.012 + seed * 8.0) * 0.22;
        pos.y = yBase + broadWave + fineWave + (local - 0.5) * (0.58 + ridge * 0.14);
        pos.z = zLayer + broadWave * 1.35 + ribbonNoise * 1.85;
  
        float pulseLine = 0.5 + 0.5 * sin(ribbonPhase * (1.7 + seed * 0.9) - t * 0.32 + seed * 6.0);
        vec3 aurora = mix(vec3(0.52, 0.86, 1.0), vec3(0.70, 0.58, 1.0), bandN);
        aurora = mix(aurora, vec3(0.96, 0.98, 0.92), bassGlow * 0.05);
        vAlpha = (0.18 + ridge * 0.78 + pulseLine * highGlow * 0.035 + bassGlow * 0.025) * softMask * (0.96 + transition * 0.02);
        vColor = mix(coverColor, aurora, 0.62 + ridge * 0.22) * (0.76 + ridge * 0.86 + pulseLine * highGlow * 0.05 + bassGlow * 0.04);
        maxRippleAmp = max(maxRippleAmp, ridge * (0.12 + midGlow * 0.05) + pulseLine * highGlow * 0.045 + bassGlow * 0.030);
      } else {
        float q = (lane - 0.80) / 0.20;
        float seed = hash11(aRand * 917.0 + floor(q * 130.0));
        float depth = mix(-32.0, 18.0, seed);
        float drift = fract(aUv.x + t * (0.0014 + seed * 0.0048) + seed * 0.63);
        float cluster = snoise(vec3(seed * 2.0, q * 3.2, t * 0.007));
        float x = (drift - 0.5) * (45.0 + seed * 22.0) + cluster * 3.4;
        float y = (hash11(aRand * 331.0 + seed * 5.0) - 0.5) * 22.0 + sin(t * (0.018 + seed * 0.028) + seed * 7.0) * 0.86;
        float z = depth + sin(t * (0.020 + seed * 0.032) + aRand * 8.0) * 1.05;
        float twinkle = pow(0.5 + 0.5 * sin(t * (0.24 + seed * 0.42) + aRand * 17.0), 5.0);
        float dust = smoothstep(0.22, 0.98, hash11(aRand * 661.0 + floor(q * 160.0)));
  
        pos = vec3(x, y, z);
        vAlpha = dust * (0.16 + twinkle * 0.46 + highGlow * 0.025 + bassGlow * 0.018) * (1.0 - q * 0.06);
        vColor = mix(coverColor, vec3(0.92, 0.97, 1.0), 0.62 + twinkle * 0.14) * (0.72 + twinkle * 0.62 + bassGlow * 0.025);
        maxRippleAmp = max(maxRippleAmp, twinkle * highGlow * 0.055 + dust * bassGlow * 0.030);
      }
  
      if (transition > 0.001) {
        float bloom = smoothstep(0.0, 1.0, transition);
        vec2 burstVec = pos.xy + vec2(hash11(aRand * 31.0) - 0.5, hash11(aRand * 47.0) - 0.5) * 0.75;
        vec2 burstDir = burstVec / max(length(burstVec), 0.001);
        pos.xy += burstDir * bloom * 0.026;
        pos.xy += vec2(snoise(vec3(aRand, t * 0.014, 1.0)), snoise(vec3(aRand, t * 0.014, 5.0))) * bloom * 0.06;
        pos.xy *= 1.0 + bloom * 0.014;
        pos.z += (hash11(aRand * 123.0) - 0.5) * bloom * 0.18;
        vAlpha *= 0.86 + bloom * 0.22;
        maxRippleAmp = max(maxRippleAmp, bloom * 0.10);
      }
    }
  
    // ====================================================
    //  鼠标交互 (仅 SILK)
    // ====================================================
    if (uMouseActive > 0.5 && uPreset < 0.5) {
      float mdx = pos.x - uMouseXY.x;
      float mdy = pos.y - uMouseXY.y;
      float md = sqrt(mdx*mdx + mdy*mdy);
      if (md < 1.0) {
        float push = (1.0 - md) * (1.0 - md);
        pos.z += push * 0.55;
      }
    }
  
    // ====================================================
    //  v8 手势遮挡 — uHandActive 是 0..1 平滑过渡, 大半径推开
    // ====================================================
    if (uHandActive > 0.01) {
      float hdx = pos.x - uHandXY.x;
      float hdy = pos.y - uHandXY.y;
      float hd = sqrt(hdx*hdx + hdy*hdy);
      float rad = 1.55;
      if (hd < rad) {
        float push = (rad - hd) / rad;
        push = push * push * uHandActive;
        pos.z += push * 1.10;
        vec2 outDir = vec2(hdx, hdy) / max(0.001, hd);
        pos.xy += outDir * push * 0.28;
      }
    }
    if (uGestureGrip > 0.001) {
      float grip = clamp(uGestureGrip, 0.0, 1.0);
      float gripWave = 0.5 + 0.5 * sin(uTime * 2.2 + aRand * 6.2831);
      pos.xy *= mix(1.0, 0.66 + gripWave * 0.035, grip);
      pos.z += grip * (0.18 + uBass * 0.22 + gripWave * 0.10);
    }
  
    // ====================================================
    //  通用: 离散感 / 扭曲
    // ====================================================
    if (uScatter > 0.001) {
      vec2 jdir = vec2(cos(aRand * 6.2831), sin(aRand * 6.2831));
      pos.xy += jdir * uScatter * (0.05 + uTreble * 0.10);
    }
    if (uTwist > 0.001 && uPreset < 0.5) {
      float ta = uTwist * pos.z * 0.6;
      float cs = cos(ta), sn = sin(ta);
      pos.xy = mat2(cs, -sn, sn, cs) * pos.xy;
    }
  
    // 颜色
    float vinylHiResGuard = smoothstep(1.08, 1.55, uCoverRes) * step(3.5, uPreset) * (1.0 - step(4.5, uPreset));
    float edgeBoost = uEdgeEnabled * edgeVal * mix(1.0, 0.42, vinylHiResGuard);
    vSourceLum = dot(max(vColor, vec3(0.0)), vec3(0.299, 0.587, 0.114));
    float blackParticleGuard = 1.0 - smoothstep(0.025, 0.115, vSourceLum);
    vEdgeBoost = edgeBoost * (uPreset > 3.5 ? 0.22 : 1.0) * (1.0 - blackParticleGuard);
    vColor = pow(max(vColor, vec3(0.0)), vec3(1.0 / max(0.35, uColorBoost)));
    float edgeColorMix = edgeBoost * (uPreset > 3.5 ? 0.20 : 0.50) * (1.0 - blackParticleGuard);
    vColor = mix(vColor, vColor + vec3(0.20), edgeColorMix);
    float tintLum = max(max(vColor.r, vColor.g), vColor.b);
    vec3 tintedColor = uTintColor * max(0.24, tintLum * 1.12);
    vColor = mix(vColor, tintedColor, clamp(uTintStrength, 0.0, 1.0) * (1.0 - blackParticleGuard));
  
    vBright = 0.82 + maxRippleAmp * 0.55 + uBass * 0.10 + edgeBoost * 0.30 + uEnergy * 0.05 + uBurstAmt * 0.40;
    if (uPreset > 6.5) {
      vBright = 1.04 + maxRippleAmp * 0.88 + uBass * 0.05 + uEnergy * 0.06 + uBeat * 0.58 + uBurstAmt * 0.24;
    } else if (uPreset > 99.5) {
      vBright = 1.02 + maxRippleAmp * 0.92 + uBass * 0.05 + uEnergy * 0.08 + uBeat * 0.72 + uBurstAmt * 0.22;
    } else if (uPreset > 4.5) {
      vBright = 0.94 + maxRippleAmp * 0.34 + uBass * 0.020 + uEnergy * 0.026 + uBurstAmt * 0.025;
    } else if (uPreset > 3.5) {
      vBright = 0.94 + maxRippleAmp * 0.64 + uBass * 0.08 + edgeBoost * 0.12 + uEnergy * 0.05 + uBeat * 0.16 + uBurstAmt * 0.16;
    }
    vRipple = clamp(maxRippleAmp * 1.5, 0.0, 1.0);
  
    if (uHasDepth > 0.5 && uPreset < 0.5) {
      float bgMul = mix(1.0, 0.55, uBgFade * (1.0 - fgMask));
      vBright *= bgMul;
    }
    vBright += uGestureGrip * 0.22;
    float loadingMistSize = 1.0;
  
    // 加载形态: 雾状微尘流，避免廉价旋转圆环
    if (uLoading > 0.001) {
      float mistSeed = hash11(aRand * 931.7);
      float mistLayer = floor(mistSeed * 4.0);
      float layerN = (mistLayer + 0.5) / 4.0;
      float mistAngle = aRand * 6.2831 + uTime * (0.16 + mistSeed * 0.18) + snoise(vec3(aRand * 2.1, uTime * 0.24, 2.0)) * 1.85;
      float mistR = mix(1.35, 3.15, sqrt(hash11(aRand * 127.3))) * (1.0 + sin(uTime * 0.42 + aRand * 7.0) * 0.13);
      vec2 mistCurl = vec2(
        snoise(vec3(aRand * 4.1, uTime * 0.32, 3.0)),
        snoise(vec3(aRand * 4.7, uTime * 0.30, 8.0))
      );
      float mistBreath = 0.5 + 0.5 * sin(uTime * (0.82 + mistSeed * 0.55) + aRand * 17.0);
      float mistRibbon = sin(mistAngle * (1.35 + layerN * 0.55) + uTime * 0.34 + mistSeed * 4.0);
      float glowPick = smoothstep(0.88, 0.997, hash11(aRand * 1501.0 + mistLayer * 17.0));
      float dustPick = 0.34 + glowPick * 0.66;
      vec3 mistPos = vec3(
        cos(mistAngle) * mistR * (1.24 + mistCurl.x * 0.16) + mistCurl.x * 0.72,
        sin(mistAngle * 0.82 + mistRibbon * 0.25) * mistR * (0.56 + layerN * 0.10) + mistCurl.y * 0.62,
        (layerN - 0.5) * 4.85 + mistCurl.x * 0.56 + mistBreath * 0.36 + mistRibbon * 0.24
      );
      vec3 mistCol = mix(vec3(0.62, 0.86, 0.84), vec3(0.36, 0.46, 0.78), mistSeed);
      mistCol = mix(mistCol, vec3(0.94, 1.0, 0.97), glowPick * (0.45 + mistBreath * 0.35));
      vColor = mix(vColor, mistCol, uLoading * 0.78);
      vBright = mix(vBright, 0.20 + mistBreath * 0.18 + abs(mistCurl.x) * 0.06 + glowPick * (0.72 + abs(mistRibbon) * 0.24), uLoading);
      vAlpha = mix(vAlpha, 0.08 + mistBreath * 0.11 + dustPick * 0.11 + glowPick * 0.30, uLoading);
      pos = mix(pos, mistPos, uLoading);
      loadingMistSize = 1.26 + mistBreath * 0.24 + abs(mistRibbon) * 0.14 + glowPick * 0.78;
    }
  
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    float depthSize = 36.0 / max(0.5, -mvPos.z);
    float audioBoost = 1.0 + maxRippleAmp * 0.7 + edgeBoost * 0.55 + uBeat * 0.30 + uBurstAmt * 0.5;
    float sz = clamp(depthSize * audioBoost, 1.05, 4.95);
    if (uPreset > 6.5) {
      float hexDrive = uBeat * 0.62 + uBass * 0.18 + uTreble * 0.26 + uBurstAmt * 0.18;
      sz = clamp(depthSize * (1.04 + hexDrive * 0.72), 0.92, 4.60);
    } else if (uPreset > 99.5) {
      float laserDrive = uBeat * 0.80 + uBass * 0.22 + uTreble * 0.34 + uBurstAmt * 0.22;
      sz = clamp(depthSize * (1.45 + laserDrive * 1.35), 1.25, 10.80);
      float laserBallMask = step(0.76, aUv.y) * (1.0 - step(0.98, aUv.y));
      float laserRayMask = 1.0 - step(0.76, aUv.y);
      float laserBallSize = clamp(depthSize * (0.72 + laserDrive * 0.18), 0.72, 2.85);
      float laserRaySize = clamp(depthSize * (0.84 + laserDrive * 0.30), 0.82, 3.65);
      sz = mix(sz, laserRaySize, laserRayMask);
      sz = mix(sz, laserBallSize, laserBallMask);
    } else if (uPreset > 4.5) {
      float flowDrive = uBass * 0.070 + uMid * 0.046 + uTreble * 0.060 + uBurstAmt * 0.090 + uBeat * 0.055;
      sz = clamp(depthSize * (1.05 + flowDrive), 1.00, 5.45);
    } else if (uPreset > 3.5) {
      float ringDrive = uBass * 0.30 + uMid * 0.18 + uTreble * 0.22 + uBeat * 0.30;
      sz = clamp(depthSize * (0.90 + ringDrive * 0.62), 1.05, 3.90);
    }
    // 加载态下粒子稍大
    sz = mix(sz, sz * loadingMistSize, uLoading);
    gl_PointSize = sz * uPixel * uPointScale;
    gl_Position = projectionMatrix * mvPos;
  }
`;
