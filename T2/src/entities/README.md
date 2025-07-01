# Entities System - Refactored

This document outlines the simplified and improved entity system.

## Architecture Overview

```
entities/
├── player/
│   ├── player.js          # Player hitbox system
│   └── index.js           # Player exports
├── enemies/
│   ├── base/
│   │   ├── enemies.js     # Base Enemy class + EnemyManager
│   │   └── index.js       # Base exports
│   ├── types/
│   │   ├── lostSoul.js    # LostSoul enemy implementation
│   │   └── index.js       # Types exports
│   ├── enemy.js           # Enemy manager for Lost Souls
│   └── index.js           # Enemies exports
└── index.js               # Main entities exports
```

## Key Improvements

### 1. **Simplified Enemy Base Class**
- Cleaner constructor with better defaults
- Organized health bar system using `THREE.Group`
- Simplified movement methods
- Better resource management

### 2. **Streamlined LostSoul Class**
- Reduced from 600+ lines to ~200 lines
- Removed excessive debugging and comments
- Consolidated similar methods
- Cleaner skull loading and setup
- Simplified movement and collision logic

### 3. **Enhanced Player System**
- Better error handling
- Cleaner API
- Improved documentation
- Removed redundant code

### 4. **Improved Enemy Manager**
- More focused responsibilities
- Better separation of concerns
- Cleaner utility functions
- Reduced code duplication

### 5. **Better Code Organization**
- Consistent naming conventions
- Proper JSDoc comments
- Cleaner imports/exports
- Logical file structure

## Usage Examples

### Creating Enemies
```javascript
import { createEnemies, updateEnemies } from './entities/enemies/enemy.js';

// Initialize enemies
await createEnemies(scene);

// Update loop
updateEnemies(delta, scene, camera, gun, collidableObjects);
```

### Using Enemy Manager Class
```javascript
import { EnemyManager } from './entities/enemies/base/enemies.js';

const enemyManager = new EnemyManager();
enemyManager.initialize(scene);
enemyManager.update(delta, camera, targetPosition);
```

### Player Hitbox
```javascript
import { createHitbox, updateHitbox } from './entities/player/player.js';

const hitbox = createHitbox(scene);
updateHitbox(camera);
```

## Configuration

All entities respect the global `CONFIG` object for:
- Debug settings
- Collision parameters
- Movement speeds
- Visual settings

## Performance Improvements

1. **Reduced complexity**: Simpler algorithms and fewer calculations
2. **Better memory management**: Proper disposal of resources
3. **Optimized collision detection**: Smarter collision checking
4. **Cleaner animations**: More efficient rotation and movement
5. **Reduced debug overhead**: Debug code only runs when enabled

## Backward Compatibility

The refactored system maintains backward compatibility with existing code while providing cleaner APIs for new implementations.
