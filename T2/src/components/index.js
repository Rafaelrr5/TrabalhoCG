export { BaseWeapon } from './baseWeapon.js';
export { Gun } from './weapon.js';
export { Chaingun } from './chaingun.js';
export { WeaponManager, weaponManager } from './weaponManager.js';

export {
    createGun,
    initGun,
    startShooting as startGunShooting,
    stopShooting as stopGunShooting,
    updateProjectiles as updateGunProjectiles,
    toggleWeaponVisibility as toggleGunVisibility,
    setWeaponVisibility as setGunVisibility,
    debugWeaponInfo as debugGunInfo,
    getProjectiles as getGunProjectiles,
    getGun
} from './weapon.js';

export {
    createGun as createChaingun,
    initGun as initChaingun,
    startShooting as startChainggunShooting,
    stopShooting as stopChainggunShooting,
    updateProjectiles as updateChainggunProjectiles,
    toggleWeaponVisibility as toggleChainggunVisibility,
    setWeaponVisibility as setChainggunVisibility,
    debugWeaponInfo as debugChainggunInfo,
    forceWeaponVisible as forceChainggunVisible,
    updateWeapon as updateChainggun,
    getProjectiles as getChainggunProjectiles,
    getGun as getChaingun
} from './chaingun.js';

export {
    createWeaponManager,
    startShooting,
    stopShooting,
    updateProjectiles,
    toggleWeaponVisibility,
    setWeaponVisibility,
    debugWeaponInfo,
    switchWeapon,
    nextWeapon,
    previousWeapon,
    getCurrentWeapon,
    forceWeaponVisible
} from './weaponManager.js';
