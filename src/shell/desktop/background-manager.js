import { getWallpaperKey, loadFromLocalStorage, saveToLocalStorage } from '../auth.js';

const TEMP_BG_URL = './temp/index.html';
const DEFAULT_WALLPAPER = { mode: 'temp' };

let bgLayer = null;
let tempIframe = null;
let customEl = null;
let slideshowTimer = null;
let currentUserKey = 'guest';

export function initBackgroundManager(userKey = 'guest') {
    currentUserKey = userKey;
    const desktopScreen = document.getElementById('desktop-screen');
    if (!desktopScreen) return;

    bgLayer = document.getElementById('bg-layer');
    if (!bgLayer) {
        bgLayer = document.createElement('div');
        bgLayer.id = 'bg-layer';
        Object.assign(bgLayer.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            zIndex: '0',
            overflow: 'hidden',
            pointerEvents: 'none'
        });
        desktopScreen.insertBefore(bgLayer, desktopScreen.firstChild);
    }

    applyWallpaper(loadWallpaperConfig());
}

export function loadWallpaperConfig() {
    const saved = loadFromLocalStorage(getWallpaperKey(currentUserKey));
    return saved || { ...DEFAULT_WALLPAPER };
}

export function saveWallpaperConfig(config) {
    saveToLocalStorage(getWallpaperKey(currentUserKey), config);
    applyWallpaper(config);
}

export function applyWallpaper(config) {
    if (!bgLayer) return;
    clearSlideshow();

    if (customEl) { customEl.remove(); customEl = null; }
    if (tempIframe) { tempIframe.style.display = 'none'; }

    if (!config || config.mode === 'temp') {
        showTempBackground();
        return;
    }

    if (config.mode === 'image' && config.images?.length) {
        showCustomImage(config.images[0]);
        return;
    }

    if (config.mode === 'slideshow' && config.images?.length) {
        showSlideshow(config.images, config.interval || 8000);
        return;
    }

    showTempBackground();
}

function showTempBackground() {
    if (!tempIframe) {
        tempIframe = document.createElement('iframe');
        tempIframe.id = 'temp-bg-iframe';
        tempIframe.src = TEMP_BG_URL;
        tempIframe.setAttribute('title', 'Desktop Background');
        Object.assign(tempIframe.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            border: 'none',
            pointerEvents: 'none'
        });
        bgLayer.appendChild(tempIframe);
    }
    tempIframe.style.display = 'block';
}

function showCustomImage(src) {
    customEl = document.createElement('div');
    Object.assign(customEl.style, {
        position: 'absolute',
        top: '0', left: '0',
        width: '100%', height: '100%',
        backgroundImage: `url(${src})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
    });
    bgLayer.appendChild(customEl);
}

function showSlideshow(images, interval) {
    let index = 0;
    showCustomImage(images[index]);
    slideshowTimer = setInterval(() => {
        index = (index + 1) % images.length;
        if (customEl) {
            customEl.style.backgroundImage = `url(${images[index]})`;
        }
    }, interval);
}

function clearSlideshow() {
    if (slideshowTimer) {
        clearInterval(slideshowTimer);
        slideshowTimer = null;
    }
}

export function importSingleImage(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('File không phải ảnh hợp lệ.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const config = { mode: 'image', images: [reader.result] };
            saveWallpaperConfig(config);
            resolve(config);
        };
        reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
        reader.readAsDataURL(file);
    });
}

export function importImageFolder(fileList) {
    const images = [];
    const readers = [];

    Array.from(fileList).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        readers.push(new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => { images.push(reader.result); resolve(); };
            reader.readAsDataURL(file);
        }));
    });

    return Promise.all(readers).then(() => {
        if (images.length === 0) throw new Error('Không tìm thấy ảnh trong thư mục.');
        const config = images.length === 1
            ? { mode: 'image', images }
            : { mode: 'slideshow', images, interval: 8000 };
        saveWallpaperConfig(config);
        return config;
    });
}

export function resetToTempBackground() {
    saveWallpaperConfig({ ...DEFAULT_WALLPAPER });
}

export function setSleepMode(active) {
    if (bgLayer) bgLayer.style.zIndex = active ? '99998' : '0';
}
