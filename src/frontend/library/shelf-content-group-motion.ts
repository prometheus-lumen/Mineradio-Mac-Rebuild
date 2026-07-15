function initializeShelfContentGroup(group: THREE.Group): void {
  var layout = shelfLayoutProfile().detail;
  var skullDetail = shouldUseSkullSafeShelfCamera();
  var dynamicDetail = !skullDetail && shouldUseShelfDynamicCamera('shelf-detail') && camera;
  var coverRotationX = particles?.rotation.x || 0;
  var coverRotationY = particles?.rotation.y || 0;
  var coverRotationZ = particles?.rotation.z || 0;
  group.userData.detailIntro = 1;
  group.position.set(
    layout.x + (skullDetail ? 0.10 : 0.16),
    layout.y - (skullDetail ? 0.02 : 0.024),
    layout.z - (skullDetail ? 0.05 : 0.070)
  );
  if ((skullDetail || dynamicDetail) && camera) {
    group.quaternion.copy(camera.quaternion);
    group.rotateX(layout.rx);
    group.rotateY(layout.ry + (skullDetail ? 0.014 : 0.018));
  } else {
    group.rotation.y = coverRotationY * 0.82 + layout.ry + 0.018;
    group.rotation.x = coverRotationX * 0.72 + layout.rx;
    group.rotation.z = coverRotationZ * 0.70;
  }
  group.scale.setScalar(layout.scale * 0.965);
  if (window.gsap) {
    window.gsap.killTweensOf(group.userData);
    window.gsap.to(group.userData, { detailIntro: 0, duration: 0.48, ease: 'power3.out' });
  } else {
    group.userData.detailIntro = 0;
  }
}

function updateShelfContentGroup(group: THREE.Group): void {
  var intro = group.userData.detailIntro || 0;
  var pointerX = pointerParallax.x || 0;
  var pointerY = pointerParallax.y || 0;
  var layout = shelfLayoutProfile().detail;
  var skullDetail = shouldUseSkullSafeShelfCamera();
  var dynamicDetail = !skullDetail && shouldUseShelfDynamicCamera('shelf-detail') && camera;
  var coverBound = !skullDetail && !dynamicDetail && Boolean(particles?.rotation);
  var coverBindX = coverBound ? particles.rotation.y * 0.18 : 0;
  var coverBindY = coverBound ? particles.rotation.x * -0.16 : 0;
  var coverBindZ = coverBound ? Math.abs(particles.rotation.y) * 0.030 : 0;
  group.position.set(
    layout.x + coverBindX + intro * (skullDetail ? 0.10 : 0.16) + pointerX * (skullDetail ? 0.024 : 0.030),
    layout.y + coverBindY - intro * (skullDetail ? 0.02 : 0.024) + pointerY * 0.026,
    layout.z + coverBindZ - intro * (skullDetail ? 0.05 : 0.070) + pointerY * (skullDetail ? 0.014 : 0.016) - pointerX * 0.010
  );
  if (skullDetail && camera) {
    group.quaternion.copy(camera.quaternion);
    group.rotateX(layout.rx - pointerY * 0.004);
    group.rotateY(layout.ry + intro * 0.004 + pointerX * 0.004);
  } else if (dynamicDetail && camera) {
    group.quaternion.copy(camera.quaternion);
    group.rotateX(layout.rx - pointerY * 0.006);
    group.rotateY(layout.ry + intro * 0.012 + pointerX * 0.008);
  } else {
    var coverRotationX = particles?.rotation.x || 0;
    var coverRotationY = particles?.rotation.y || 0;
    var coverRotationZ = particles?.rotation.z || 0;
    group.rotation.x += (coverRotationX * 0.72 + layout.rx - pointerY * 0.010 - group.rotation.x) * 0.16;
    group.rotation.y += (coverRotationY * 0.82 + layout.ry + intro * 0.018 + pointerX * 0.014 - group.rotation.y) * 0.16;
    group.rotation.z += (coverRotationZ * 0.70 - group.rotation.z) * 0.14;
  }
  group.scale.setScalar(layout.scale * (1 - intro * (skullDetail ? 0.020 : 0.035)));
}

function closeShelfContentGroup(
  group: THREE.Group,
  rows: ShelfContentRow[],
  panel: ShelfContentPanel | null
): void {
  var dispose = function(): void {
    group.parent?.remove(group);
    disposeShelfContentRows(rows);
    disposeShelfContentPanel(panel);
  };
  if (!window.gsap) {
    dispose();
    return;
  }
  var materials: THREE.Material[] = rows.map(function(row): THREE.Material { return row.mesh.material; });
  if (panel) materials.push(panel.mesh.material);
  window.gsap.killTweensOf(group.position);
  window.gsap.killTweensOf(group.scale);
  window.gsap.to(group.scale, { x: 0.965, y: 0.965, z: 0.965, duration: 0.18, ease: 'power2.in' });
  window.gsap.to(group.position, {
    x: group.position.x + 0.18,
    y: group.position.y - 0.02,
    z: group.position.z - 0.10,
    duration: 0.18,
    ease: 'power2.in'
  });
  if (materials.length) {
    window.gsap.to(materials, {
      opacity: 0,
      duration: 0.16,
      ease: 'power2.in',
      onComplete: dispose
    });
  } else {
    window.setTimeout(dispose, 180);
  }
}
