import * as THREE from '../../../build/three.module.js';

export function loadSky(scene, texturePath, options = {}) {
    console.log('[SKY] Loading sky texture:', texturePath);
    
    const textureLoader = new THREE.TextureLoader();
    
    // Try multiple paths like textureManager does
    const possiblePaths = [
        texturePath,
        `assets/textures/${texturePath}`,
        `../assets/textures/${texturePath}`,
        `../../assets/textures/${texturePath}`
    ];
    
    let loadAttempt = 0;
    
    function tryLoadTexture(pathIndex = 0) {
        if (pathIndex >= possiblePaths.length) {
            console.error('[SKY] ❌ Sky texture not found:', texturePath);
            return;
        }
        
        const currentPath = possiblePaths[pathIndex];
        console.log(`[SKY] Trying path ${pathIndex + 1}/${possiblePaths.length}:`, currentPath);
        
        let textureEquirec = textureLoader.load(
            currentPath, 
            (texture) => {
                if (options.redTint) {
                    applyRedFilter(texture, options.redTint);
                }
                console.log('[SKY] ✅ Sky loaded and applied to scene from:', currentPath);
            },
            undefined,
            (error) => {
                console.warn(`[SKY] Failed to load from path ${pathIndex + 1}:`, currentPath);
                tryLoadTexture(pathIndex + 1);
            }
        );
        
        textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
        textureEquirec.colorSpace = THREE.SRGBColorSpace;
        
        scene.background = textureEquirec;
    }
    
    tryLoadTexture();
}

function applyRedFilter(texture, intensity = 0.8) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const img = texture.image;
    if (img.complete) {
        processImage();
    } else {
        img.onload = processImage;
    }

    function processImage() {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(200, data[i] + (200 * intensity));
            data[i + 1] *= (1 - intensity * 0.9); // Green
            data[i + 2] *= (1 - intensity * 0.95); // Blue
        }

        ctx.putImageData(imageData, 0, 0);

        texture.image = canvas;
        texture.needsUpdate = true;

        console.log('[SKY] Dark red filter applied with intensity:', intensity);
    }
}

export function loadSkyWithTint(scene, texturePath, tintColor = new THREE.Color(0xff6666)) {
    console.log('[SKY] Loading sky with color tint:', texturePath);
    
    const textureLoader = new THREE.TextureLoader();
    let textureEquirec = textureLoader.load(texturePath);
    textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    textureEquirec.colorSpace = THREE.SRGBColorSpace;
    
    scene.background = textureEquirec;
    
    scene.fog = new THREE.Fog(tintColor, 100, 1000);
    
    console.log('[SKY] Sky with tint loaded');
}
