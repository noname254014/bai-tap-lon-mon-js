const APP_ICONS = {
    'File Explorer': './src/shell/assets/icons/default_folder.svg',
    'Task Manager': './src/shell/assets/icons/file_type_taskfile.svg',
    'User Manager': './src/shell/assets/icons/default_file.svg',
    'Elevator Simulation': './src/shell/assets/icons/default_file.svg'
};

let iconsContainer = null;
let onAppLaunch = null;

export function initDesktopIcons(desktopElement, launchCallback, apps = ['File Explorer', 'Task Manager']) {
    onAppLaunch = launchCallback;

    iconsContainer = document.getElementById('desktop-icons');
    if (iconsContainer) iconsContainer.remove();

    iconsContainer = document.createElement('div');
    iconsContainer.id = 'desktop-icons';
    Object.assign(iconsContainer.style, {
        position: 'absolute',
        top: '16px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        gap: '8px',
        maxHeight: 'calc(100vh - 64px)',
        zIndex: '10',
        pointerEvents: 'auto'
    });

    apps.forEach((appName, i) => {
        iconsContainer.appendChild(createIcon(appName, i));
    });

    desktopElement.insertBefore(iconsContainer, desktopElement.firstChild);
    return iconsContainer;
}

function createIcon(appName, index) {
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.dataset.app = appName;
    Object.assign(icon.style, {
        width: '80px',
        padding: '8px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        borderRadius: '6px',
        userSelect: 'none',
        transition: 'background 0.15s'
    });

    const imgWrap = document.createElement('div');
    Object.assign(imgWrap.style, {
        width: '48px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.12)',
        borderRadius: '10px',
        backdropFilter: 'blur(4px)'
    });

    const img = document.createElement('img');
    img.src = APP_ICONS[appName] || APP_ICONS['User Manager'];
    img.alt = appName;
    Object.assign(img.style, { width: '32px', height: '32px' });
    imgWrap.appendChild(img);

    const label = document.createElement('span');
    label.textContent = appName;
    Object.assign(label.style, {
        color: '#fff',
        fontSize: '11px',
        textAlign: 'center',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        lineHeight: '1.2',
        wordBreak: 'break-word'
    });

    icon.appendChild(imgWrap);
    icon.appendChild(label);

    icon.addEventListener('mouseenter', () => {
        icon.style.background = 'rgba(255,255,255,0.15)';
    });
    icon.addEventListener('mouseleave', () => {
        icon.style.background = 'transparent';
    });

    icon.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (onAppLaunch) onAppLaunch(appName);
    });

    return icon;
}

export function setIconsVisible(visible) {
    if (iconsContainer) {
        iconsContainer.style.display = visible ? 'flex' : 'none';
    }
}
