# Sugar Scum
A mod to automate save scumming for Garden Plants and Sugar Lumps

# How to use
To import the mod, either:

Paste the folowing into your browser's console (can be opened by right-clicking and selecting "Inspect Element).
```javascript
Game.LoadMod('https://sky-noname.github.io/SugarScum/sugarScum.js');
```

Or, create a bookmarklet and save the following as the link. To load the mod, simply click on the bookmark.
```javascript
javascript: (function () {
    Game.LoadMod('https://sky-noname.github.io/SugarScum/sugarScum.js');
}());
```

Or, if you have the Cookie Clicker Mod Manager extension, register a new mod and paste the following as the URL.
```
https://sky-noname.github.io/SugarScum/sugarScum.js
```

# How it works
## Garden Scum
![Screenshot of the Garden Scum Menu.](/Images/GardenMenu.png)

The Garden has two types of scums: Manual and Auto
### Manual Scum
The Manual Scum stores the export code of your last garden tick. Click on the 'Reload Tick' button as a quick way to save scum the tick, without the need to copy-paste.

### Auto Scum
The Auto Scum menu displays what seeds have a chance of growing next tick. Simply select however many seeds you want and start the auto-scum, the mod will continually reload the next tick until these seeds have spawned!

![Screenshot of a successful Garden Scum.](/Images/GardenResult.png)

## Lump Scum
![Screenshot of the Lump Scum Menu.](/Images/LumpMenu.png)

The Lump Scum menu displays what your current sugar lump type is. Here you can select what you'd like your next lump type to be, as well as what yield you want from your current lump. Even if your lump isn't ready to be harvested yet, you can still set up the auto-scum to start scumming as soon as it ripens!

![Screenshot of a successful Lump Scum.](/Images/LumpResult.png)

## Notes
- This mod requires the Garden to be unlocked in order to load. If you try loading it without one, the mod won't register (meaning you won't get the Third-Party achievement either).
- To prevent issues with save scumming, when starting an Auto-Scum certain features will be temporarily disabled:
    - Starting a Lump Scum will disable all Garden Scum options and vice-versa.
    - If your Sugar Lump is yet to ripe, turning on the Auto-Scum will ready the mod to start scumming as soon as the lump ripens. This means that until then, all Garden Scum features will be disabled unless the scum is cancelled.
    - The Manual Scum in the garden will also be disabled if the garden is set to Auto-Scum the next tick.
- The Garden Scum is unavailable if the garden is frozen as it prevents the next tick from rolling over.
