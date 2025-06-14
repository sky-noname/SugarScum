Game.registerMod("sugarScum", {
	init: function() {
		// ========== GARDEN SCUM ==========
		
		class GardenScumUI {
			static reloadTickButton;
			static autoScumButton;
			static cancelScumButton;
			static seedsEnabled = true;
			static conflictingIDs = [];
			
			static DisplaySeeds() {
				// Don't update if scumming
				if(GardenScum.scumming) return;
				
				// Clear display
				document.getElementById('possibleSeedsNextTick').innerHTML = '';
				
				// Get chances
				const chances = NextTickMutations.GetPlantChances();
				
				// No seeds are able to sprout/mutate
				if(Object.keys(chances).length === 0) {
					document.getElementById('possibleSeedsNextTick').insertAdjacentHTML('beforeend', `
					<div id="noSeed" class="gardenSeed" style="height: 50px;" onmouseover="Game.tooltip.wobble(); GardenScumUI.SeedTooltip(this, -1, 0);" onmouseout="Game.tooltip.shouldHide=1;">
						<div id="noSeedIcon" class="gardenSeedIcon shadowFilter" style="background:url(img/icons.png); background-position:0px -336px"; float: top"></div>
						<div id="seedLabel-${i}" style="text-align: center; margin-top: 40px;">Nothing</div>
					</div>`);
				}
				// New seeds are able to sprout/mutate
				else {
					for(let i = 0; i < 34; i++) {
						const plant = garden.plantsById[i];
						
						// Plant has a chance to grow
						if(chances[plant.key]) {
							const seedChance = (chances[plant.key] * 100).toFixed(2);
							document.getElementById('possibleSeedsNextTick').insertAdjacentHTML('beforeend', `
							<div id="possibleSeed-${i}" class="gardenSeed" style="height: 50px;" onmouseover="Game.tooltip.wobble(); GardenScumUI.SeedTooltip(this, ${i}, ${seedChance});" onmouseout="Game.tooltip.shouldHide=1;" onclick="GardenScumUI.SelectSeed(${i});">
								<div id="possibleSeedIcon-${i}" class="gardenSeedIcon shadowFilter" style="background-position: 0px ${plant.icon * -48}px; float: top"></div>
								<div id="seedLabel-${i}" style="text-align: center; margin-top: 40px;">${seedChance}%</div>
							</div>`);
						}
					}
					
					// Reselect and deselect seeds
					GardenScumUI.conflictingIDs = [];
					var seedsToRemove = [];
					for(let seed of GardenScum.selectedSeeds) {
						// Seed is still available
						if(garden.plantsById[seed].key in chances) {
							// Seed conflicts with a selected one
							if(GardenScumUI.conflictingIDs.includes(seed)) {
								seedsToRemove.push(seed);
								
								// Auto-scum is no longer possible since the selected seeds are conflicting
								if(GardenScum.saveScumThisTick) GardenScum.StopAutoScum(4,0);
							}
							// Seed does not conflict
							else GardenScumUI.ReselectSeed(seed);
						}
						// Seed is no longer available
						else {
							seedsToRemove.push(seed);
							
							// Stop the auto-scum
							if(GardenScum.saveScumThisTick) GardenScum.StopAutoScum(1,0);
						}
					}
					
					// Remove any seeds that were selected prior that are either conflicting or no longer an option
					if(seedsToRemove.length > 0) for(let seed of seedsToRemove) GardenScum.selectedSeeds.splice(GardenScum.selectedSeeds.indexOf(seed), 1);
					
					// Disable if scumming
					if(GardenScum.saveScumThisTick) GardenScumUI.ToggleSeeds(false);
				}
			}
			
			// Tooltip for the seed selection
			static SeedTooltip(el, seedID, chance) {
				// Nothing
				if(seedID === -1) {
					Game.tooltip.draw(el, `
					<div style="padding:8px; text-align:left; width: 300px;">
						<div class="name">Nothing</div>
						<br>
						No new plants are able to sprout next tick!
					</div>`, 0);
				}
				// Actually a seed
				else {
					var seed = garden.plantsById[seedID];
					var description;
					
					// Seed conflicts with a selected one
					if(GardenScumUI.conflictingIDs.includes(seedID)) {
						// Get all the conflicting seed names
						const conflictingSeed = NextTickMutations.GetMutationConflicts().find(conflict => conflict.plant === seed.key);
						const seedNames = conflictingSeed.conflictors.map(key => garden.plantsById[keyToIdMap[key]].name).join(', ');
						
						description =
						`This seed has a chance to grow in your garden next tick, but only on one tile.
						<br>
						Unfortunately, this seed is impossible to scum for with your current selection, due to the following seed(s) also only being able grow on this one tile:
						<b>${seedNames}</b>`
					}
					else {
						// Brown mold and Crumbspore
						if(seedID === 12 || seedID === 23) description =
							`This seed has a ${chance}% chance of growing either from mutations or from harvesting the Meddleweed in your garden.
							<br>
							Auto-Scum for this seed means that all Meddleweed will be harvested until ${seed.name} spawns.
							<br>
							Click to select it for auto-scumming!`;
						else description = 
							`This seed has a ${chance}% chance of growing next tick.
							<br>
							Click to select it for auto-scumming!`;
					}
					
					Game.tooltip.draw(el, `
						<div style="padding:8px; text-align:left; width: 300px;">
							<div class="name">${seed.name}</div>
							<br>
							${description}
						</div>`, 0);
				}
			}
			
			static SelectSeed(seedID) {
				// Only allow selection if seeds are enabled and seed does not conflict
				if(!GardenScumUI.seedsEnabled || GardenScumUI.conflictingIDs.includes(seedID)) return;
				
				PlaySound('snd/toneTick.mp3');
				const possibleSeed = document.getElementById(`possibleSeed-${seedID}`);
				const conflictsForThisPlant = NextTickMutations.GetMutationConflicts().find(c => c.plant === garden.plantsById[seedID].key);
				
				// Deselect
				if(GardenScum.selectedSeeds.includes(seedID)) {
					// Remove conflicts
					if(conflictsForThisPlant) for (const conflictKey of conflictsForThisPlant.conflictors) GardenScumUI.conflictingIDs.splice(GardenScumUI.conflictingIDs.indexOf(keyToIdMap[conflictKey]), 1);
					
					possibleSeed.className = 'gardenSeed'
					GardenScum.selectedSeeds.splice(GardenScum.selectedSeeds.indexOf(seedID), 1);
				}
				// Select
				else {
					// Add conflicts
					if(conflictsForThisPlant) {
						for (const conflictKey of conflictsForThisPlant.conflictors) {
							const conflictID = keyToIdMap[conflictKey];
							if(!GardenScumUI.conflictingIDs.includes(conflictID)) GardenScumUI.conflictingIDs.push(conflictID);
						}
					}
					
					possibleSeed.className = 'gardenSeed on';
					GardenScum.selectedSeeds.push(seedID);
				}
				
				GardenScumUI.UpdateConflictingOptions();
			}
			
			// This is for when the seed display updates and the player has a selected seed
			static ReselectSeed(seedID) {
				const possibleSeed = document.getElementById(`possibleSeed-${seedID}`);
				const conflictsForThisPlant = NextTickMutations.GetMutationConflicts().find(c => c.plant === garden.plantsById[seedID].key);
				
				// Add conflicts
				if(conflictsForThisPlant) {
					for (const conflictKey of conflictsForThisPlant.conflictors) {
						const conflictID = keyToIdMap[conflictKey];
						if(!GardenScumUI.conflictingIDs.includes(conflictID)) GardenScumUI.conflictingIDs.push(conflictID);
					}
				}
				
				// Update the UI if it's enabled
				if(!GardenScum.saveScumThisTick) {
					possibleSeed.className = 'gardenSeed on';
					GardenScumUI.UpdateConflictingOptions();
				}
			}
			
			static UpdateConflictingOptions() {
				// Re-enable seeds and disable conflicting seeds
				GardenScumUI.ToggleSeeds(true);
				if(GardenScumUI.conflictingIDs.length > 0) for(const id of GardenScumUI.conflictingIDs) document.getElementById(`possibleSeed-${id}`).style.opacity = 0.25;
			}
			
			// Shorthand to deselect all seeds
			static DeselectSeeds() {
				document.querySelectorAll('#possibleSeedsNextTick .gardenSeed').forEach(seed => { seed.className = 'gardenSeed'; });
			}
			
			// Enables or disables seeds
			static ToggleSeeds(enable) {
				GardenScumUI.seedsEnabled = enable;
				if(enable) document.querySelectorAll('#possibleSeedsNextTick .gardenSeed').forEach(seed => { seed.style.opacity = 1; });
				else document.querySelectorAll('#possibleSeedsNextTick .gardenSeed').forEach(seed => { seed.style.opacity = 0.25; });
			}
			
			// Update the last tick save code in the manual scum
			static UpdateSaveCode() {
				const exportCodeArea = document.getElementById('exportCode');
				
				// Check if save code for the last tick exists
				if(GardenScum.lastTickSaveCode) exportCodeArea.value = GardenScum.lastTickSaveCode;
				else exportCodeArea.value = "Either a new tick hasn't happened since the mod loaded or something went wrong, but there's no save code for your last tick :(";
			}
			
			static AutoScumButton() {
				// Garden is frozen
				if(garden.freeze === 1) {
					Game.Notify("Cannot Auto-Scum while the Garden is Frozen.", "");
					return;
				}
				
				// Button is on
				if(GardenScumUI.autoScumButton.className === 'option focused') {
					if(GardenScum.selectedSeeds.length > 0) {
						// Ready auto-scum
						GardenScum.saveScumThisTick = true;
						GardenScumUI.ToggleButtons();
						GardenScumUI.DeselectSeeds();
						GardenScumUI.ToggleSeeds(false);
						GardenScumUI.conflictingIDs = [];
						
						// Turn off Lump UI
						LumpScumUI.ToggleLumps(false);
						LumpScumUI.DeselectLumps();
						LumpScum.selectedLump = -1;
						
						Game.Notify("Sugar Scum is now set to scum your next tick!", "Let the harvest be bountiful.", [0, garden.plantsById[GardenScum.selectedSeeds[0]].icon, 'img/gardenPlants.png']);
					}
					else Game.Notify("Please select a seed first.", "");
				}
				// Button is off
				else Game.Notify("An Auto-Scum is already set to be active!", "Turn it off with the cancel button.", [1,7]);
			}
			
			static CancelScumButton() {
				if(GardenScumUI.cancelScumButton.className === 'option focused') GardenScum.StopAutoScum(2, 0);
				else Game.Notify("You have no Garden scum to cancel!", "Convenient since you wanted to cancel?", [0,7]);
			}
			
			static ReloadTickButton() {
				if(GardenScumUI.reloadTickButton.className === 'option focused') GardenScum.ReloadLastTick();
				else Game.Notify("Cannot reload right now", "To prevent issues, manual reloading isn't available while an Auto-Scum is active or set to occur.", [1,7]);
			}
			
			// Toggles buttons based on whether a scum is active
			static ToggleButtons() {
				if(GardenScum.saveScumThisTick) {
					GardenScumUI.reloadTickButton.className = 'option off';
					GardenScumUI.autoScumButton.className = 'option off';
					GardenScumUI.cancelScumButton.className = 'option focused';
					
					// Cancel button in the Lump UI should already be off
					LumpScumUI.scumButton.className = 'option off';
					LumpScumUI.decreaseButton.className = 'option off';
					LumpScumUI.increaseButton.className = 'option off';
					
					GardenScumUI.UpdateScumLabel();
				}
				else {
					GardenScumUI.reloadTickButton.className = 'option focused';
					GardenScumUI.autoScumButton.className = 'option focused';
					GardenScumUI.cancelScumButton.className = 'option off';
					
					// Don't turn the cancel button in the Lump UI on
					LumpScumUI.scumButton.className = 'option focused';
					LumpScumUI.decreaseButton.className = 'option focused';
					LumpScumUI.increaseButton.className = 'option focused';
					
					GardenScumUI.UpdateScumLabel();
				}
			}
			
			static UpdateScumLabel() {
				const label = document.getElementById('scumLabel');
				
				// Display seeds to scum for
				if (GardenScum.saveScumThisTick && GardenScum.selectedSeeds.length > 0) {
					label.style = "color: #6f6; font-weight:bold;";
					const names = GardenScum.selectedSeeds.map(id => garden.plantsById[id].name).join(', ');
					label.innerHTML = 
					`Sugar Scum will scum your next tick for:
					<br>
					${names}.`;
				}
				else {
					label.style = "color: white;";
					label.innerHTML = "Sugar Scum is not set to auto-scum your next tick.";
				}
			}
			
			// Open and close the panel
			static TogglePanel() {
				const panel = document.getElementById('sugarScumGarden');
				const button = document.getElementById('gardenScumProductButton');
				
				if (panel.style.display === 'none') {
					PlaySound('snd/clickOn2.mp3');
					panel.style.display = '';
					button.innerHTML = "Close Sugar Scum";
				}
				else {
					PlaySound('snd/clickOff2.mp3');
					panel.style.display = 'none';
					button.innerHTML = "Open Sugar Scum";
				}
			}
			
			static Build() {
				document.getElementById('row2').insertAdjacentHTML('beforeend', `
					<div id="sugarScumGarden" class="framed" style="position: inherit; text-align: center; height: 350px; overflow-y: auto;">
						<div class="title gardenPanelLabel">Sugar Scum - Garden</div>
						<div class="line"></div>
						<div id="gardenScumContentPanel" style="display: flex; justify-content: space-between;">
							<div id="contentLeft" style="padding: 1em; width: 50%">
								<div class="title gardenPanelLabel">Manual Scum</div>
								<div class="line"></div>
								<div id="lastTickLabel" style="text-align: left;">
									Here's the save code of your last garden tick.
									<br>
									Importing it will cause your current tick to reload.
									<br>
									You can either copy it yourself from the text box, or use the button to reload the tick.
									<br>
									This allows you to manually save scum the garden tick without the need to copy-paste.
									<br>
									<small>Note: Ticks forced by spending a Sugar Lump will not be saved here.</small>
								</div>
								<div id="reloadTick" style="float: left; padding: 1em">
									<a id="reloadTickButton" class="option focused" onclick="PlaySound('snd/tick.mp3'); GardenScumUI.ReloadTickButton();">
										Reload Tick
									</a>
								</div>
								<textarea id="exportCode" style="width: 95%; height: 100px;" readonly></textarea>
							</div>
							<div id ="contentRight" style="padding: 1em; width: 50%">
								<div class="title gardenPanelLabel">Auto Scum</div>
								<div class="line"></div>
								<div id="scumLabel"></div>
								<small>The following seeds have a chance to grow next tick:</small>
								<div id="seedScumPanel">
									<div id="possibleSeedsNextTick" style="padding: 1em;  display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;"></div>
									<div id="seedScumOptions">
										<div id="scumOptionsLabel" style="text-align: center; padding-bottom: 10px;">
											Select the seed(s) you'd like to scum for and turn on auto-scum.
											<br>
											Or cancel your next scum to choose different seeds.
											<br>
											Pressing cancel will also stop an active auto-scum!
										</div>
										<a id="autoScumButton" class="option focused" onclick="PlaySound('snd/tick.mp3'); GardenScumUI.AutoScumButton();">
											Start Auto-Scum
										</a>
										<a id="cancelScumButton" class="option off" onclick="PlaySound('snd/tick.mp3'); GardenScumUI.CancelScumButton();">
											Cancel Auto-Scum
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>`);
				
				// Get buttons
				GardenScumUI.reloadTickButton = document.getElementById('reloadTickButton');
				GardenScumUI.autoScumButton = document.getElementById('autoScumButton');
				GardenScumUI.cancelScumButton = document.getElementById('cancelScumButton');
				
				// Product button
				document.querySelector('#row2 .productButtons').insertAdjacentHTML('beforeend', `
			 	<div id="gardenScumProductButton" class="productButton" onclick="GardenScumUI.TogglePanel();">Close Sugar Scum</div>`);
			}
		}
		
		class GardenScum {
			static savedThisTick = true;
			static lastTickSaveCode;
			static selectedSeeds = [];
			static saveScumThisTick = false;
			static scumming = false;
			static lastPlotState = '';
			static lastSoil = -1;
			static dragonMult = 0;
			
			// Shorthand to get the time until a new tick
			static TimeToNextTick = () => (garden.nextStep-Date.now()) / 1000;
			
			static ReloadLastTick() {
				// Check if save code exists
				if(GardenScum.lastTickSaveCode) Game.ImportSaveCode(GardenScum.lastTickSaveCode);
				else {
					Game.Notify("Unable to load your last tick!", "Oops.", [17,5]);
					if(GardenScum.scumming) GardenScum.StopScumLoop();
				}
			}
			
			static CheckForSeeds(seedIDs, prevPlotsMap) {
				// Checks if all given seed IDs have NEWLY sprouted
				// This avoids the mod thinking it has scummed for a seed successfully when it sees an already growing plant of the same ID
				for (let id of seedIDs) {
					const prev = prevPlotsMap[id];
					let foundNew = false;
					
					// Loop through garden plots
					for (let y = 0; y < garden.plot.length; y++) {
						for (let x = 0; x < garden.plot[0].length; x++) {
							// Check for new seed
							if (garden.plot[y][x][0] === id + 1 && !prev.some(pos => pos.x === x && pos.y === y)) {
								foundNew = true;
								break;
							}
						}
						// New seed was found, move onto next one
						if (foundNew) break;
					}
					// Seed wasn't found
					if (!foundNew) return false;
				}
				// All seeds found
				return true;
			}
			
			// Checks for any updates to the garden
			static CheckGarden() {
				// Soil and plot check
				const currentPlot = JSON.stringify(garden.plot);
				const currentSoil = garden.soil;
				if (currentPlot !== GardenScum.lastPlotState || currentSoil !== GardenScum.lastSoil) {
					// Update soil and plot
					GardenScum.lastPlotState = currentPlot;
					GardenScum.lastSoil = currentSoil;
					GardenScumUI.DisplaySeeds();
				}
				
				// Aura check
				const currentAuraMult = Game.auraMult('Supreme Intellect');
				if(currentAuraMult != GardenScum.dragonMult) {
					// Update chances if dragon aura changed
					GardenScum.dragonMult = currentAuraMult;
					GardenScumUI.DisplaySeeds();
				}
				
				// Check if the garden is frozen
				if(garden.freeze === 1 && GardenScum.saveScumThisTick) GardenScum.StopAutoScum(3,0);
				
				// Check for tick update
				const time = GardenScum.TimeToNextTick();
				
				// Next tick is one second away
				if(time <= 1 && !GardenScum.savedThisTick) {
					// Update the save code
					GardenScum.lastTickSaveCode = Game.WriteSave(1);
					GardenScumUI.UpdateSaveCode();
					GardenScum.savedThisTick = true;
					
					// Start auto-scum
					if(GardenScum.saveScumThisTick) {
						GardenScum.StartAutoScum();
						GardenScum.saveScumThisTick = false;
					}
				}
				// New tick just rolled over
				else if(time > 1 && GardenScum.savedThisTick) {
					GardenScum.savedThisTick = false;
					GardenScumUI.DisplaySeeds();
				}
			}
			
			// Gets plots occupied with a given plant
			static PlotsWithPlant(seedID) {
				var plots = [];
				
				// Loop through plots
				for (let y = 0; y < garden.plot.length; y++) {
					for (let x = 0; x < garden.plot[0].length; x++) {
						// Plot occupied with given plant
						if(garden.plot[y][x][0] === seedID + 1) plots.push({x,y});
					}
				}
				
				return plots;
			}
			
			static StartAutoScum() {
				GardenScum.scumming = true;
				
				async function scumLoop() {
					let attempts = 0;

					// Get the previous plots that have the selected seeds so that the mod doesn't think it's scummed successfully when it sees them
					let prevPlots = {};
					for (let seed of GardenScum.selectedSeeds) prevPlots[seed] = GardenScum.PlotsWithPlant(seed);
					
					// Weed plots for Brown mold and Crumbspore
					// This way we only harvest weeds that were existed prior to this tick
					// This is to prevent the mod getting stuck if the user selects to scum both a spore and Meddleweed
					// Since it would otherwise harvest all Meddleweed that spawns this tick
					let weedPlots = GardenScum.PlotsWithPlant(13);
					
					while (GardenScum.scumming) {
						attempts++;
						
						// Wait for the game to reload
						await new Promise(resolve => {
							const check = setInterval(() => {
								if (garden) {
									clearInterval(check);
									resolve();
								}
							}, 50);
						});
						await new Promise(res => setTimeout(res, 50));
						
						// Brown mold or Crumbspore
						if(GardenScum.selectedSeeds.includes(12) || GardenScum.selectedSeeds.includes(23)) {
							// Harvest weeds
							const plotBeforeHarvest = JSON.stringify(garden.plot);
							for (let plot of weedPlots) garden.harvest(plot.x, plot.y);
							
							// Let the garden update
							await new Promise(resolve => {
								const check = setInterval(() => {
									const currentPlot = JSON.stringify(garden.plot);
									if (currentPlot !== plotBeforeHarvest) {
										clearInterval(check);
										resolve(true);
									}
								}, 50);
							});
							await new Promise(res => setTimeout(res, 50));
						}
						
						// All seeds found
						if (GardenScum.CheckForSeeds(GardenScum.selectedSeeds, prevPlots)) {
							GardenScum.StopAutoScum(0, attempts);
							break;
						}
						// Seeds not found
						else GardenScum.ReloadLastTick();
					}
				}
				
				// Start the loop
				scumLoop();
			}
			
			static StopAutoScum(reason, attempts) {
				switch(reason) {
					case 0:
						// Successful scum
						var message = GardenScum.selectedSeeds.length > 1 ? "Your selected seeds have" : garden.plantsById[GardenScum.selectedSeeds[0]].name;
						Game.Notify("Seed sprouted!", `${message} sprouted after ${attempts} attempts.`, [4, garden.plantsById[GardenScum.selectedSeeds[0]].icon, 'img/gardenPlants.png']);
						break;
					case 1:
						// Parent plants of a desired seed don't exist anymore or the plots that the seed can spawn on is occupied now
						Game.Notify("Your scum is no longer possible.", "The plants required for your desired mutation are no longer in your garden, or there's simply no space for the plant to grow!",  [3, 35, 'img/gardenPlants.png']);
						break;
					case 2:
						// Cancelled scum
						Game.Notify("Scum Cancelled.", "");
						break;
					case 3:
						// Garden frozen
						Game.Notify("Cannot Auto-Scum while the Garden is Frozen.", "");
						break;
					case 4:
						// Plots of the desired seeds have been narrowed down to just one tile, meaning they now conflict and are impossible to scum for
						Game.Notify("Your scum is no longer possible.", "Something updated in your Garden to cause the selected seeds to only be able to grow on the same tile!", [1,7]);
						break;
				}
				
				// Reset variables
				GardenScum.scumming = false;
				GardenScum.saveScumThisTick = false;
				GardenScum.selectedSeeds = [];
				
				// Update display
				GardenScumUI.DisplaySeeds();
				GardenScumUI.ToggleSeeds(true);
				GardenScumUI.ToggleButtons();
				
				LumpScumUI.ToggleLumps(true);
				LumpScumUI.DisplayLumps();
			}
		}
		
		class NextTickMutations {
			// Returns all the neighbours positions of a given plot
			static GetNeighborPositions(x, y) {
				// Surrounding plots
				const coords = [[x-1, y-1], [x, y-1], [x+1, y-1],
						[x-1, y], [x+1, y],
						[x-1, y+1], [x, y+1], [x+1, y+1]];
				// Filter out any plots that are off the garden or unlocked
				return coords.filter(([nx, ny]) => 
					nx >= 0 && 
					ny >= 0 && 
					nx < garden.plot[0].length && 
					ny < garden.plot.length && 
					garden.isTileUnlocked(nx, ny));
			}
			
			// Given a plot, returns all neighbouring plants and all neighbouring mature plants
			static CountPlants(coords) {
				const all = {};
				const mature = {};
				
				for (const [nx, ny] of coords) {
					const tile = garden.plot[ny][nx];
					const id = tile[0];
					if (id > 0) {
						// All plants
						const key = garden.plantsById[id - 1].key
						all[key] = (all[key] || 0) + 1;
						
						// Mature plants
						if (tile[1] >= garden.plantsById[id - 1].mature) mature[key] = (mature[key] || 0) + 1;
					}
				}
				return { all, mature };
			}
			
			// Checks if the plot is in range of a Tidygrass or Everdaisy
			static IsTileTidy(x, y) {
				// Loop through garden
				for (let ny = 0; ny < garden.plot.length; ny++) {
					for (let nx = 0; nx < garden.plot[0].length; nx++) {
						const tile = garden.plot[ny][nx];
						const id = tile[0];

						// Tile occupied
						if (id > 0) {
							const plant = garden.plantsById[id - 1];

							// Check if the plant is Tidygrass or Everdaisy
							let range = 0;
							if (plant.key === 'tidygrass') range = 2;
							else if (plant.key === 'everdaisy') range = 1;
							else continue;

							// Check if the plot is in range
							const dx = Math.abs(x - nx);
							const dy = Math.abs(y - ny);
							if (dx <= range && dy <= range) return true;
						}
					}
				}
				return false;
			}
			
			// Checks each tile and returns each plant that may grow next tick, what tiles, and the chance of it growing on each of those tiles
			static GetTileChances() {
				var weedMultiplier = 1;
				var mutationMultiplier = 1;
				var dragonMultiplier = 1 + 0.05 * Game.auraMult('Supreme Intellect');
				
				// Soil modifiers
				switch (garden.soil) {
					case 1:
						// Fertilizer
						weedMultiplier = 1.2;
						break;
					case 3:
						// Pebbles
						weedMultiplier = 0.1;
						break;
					case 4:
						// Wood Chips
						weedMultiplier = 0.1;
						mutationMultiplier = 3;
						break;
				}
				
				const tileChances = {};
				
				// Loop through each plot
				for (let y = 0; y < garden.plot.length; y++) {
					for (let x = 0; x < garden.plot[0].length; x++) {
						if (!garden.isTileUnlocked(x, y)) continue;
						
						const tile = garden.plot[y][x];
						const plantID = tile[0];
						
						// Tile is occupied
						if(plantID > 0) {
							// Check if spores can spawn
							if (plantID === 14 && !NextTickMutations.IsTileTidy(x, y)) {
								// Meddleweed will die next tick
								// Do not count for spores
								if (tile[1] + (garden.plantsById[plantID - 1].ageTick + garden.plantsById[plantID - 1].ageTickR) * dragonMultiplier >= 100) continue;
								
								const sporeChance = 0.002 * garden.getTile(x, y)[1];
								// Spore may spawn upon harvest
								if (sporeChance > 0) {
									for (const spore of ["brownMold", "crumbspore"]) {
										if (!tileChances[spore]) tileChances[spore] = { chances: [], tiles: [] };
										tileChances[spore].chances.push(sporeChance);
										tileChances[spore].tiles.push({ x, y });
									}
								}
							}
							continue;
						}
						
						// Get neighbours
						const neighborCoords = NextTickMutations.GetNeighborPositions(x, y);
						
						// If all neighbours are empty and Meddleweed can spawn, add to chances
						const allNeighborsEmpty = neighborCoords.every(([nx, ny]) => garden.plot[ny][nx][0] === 0);
						if (allNeighborsEmpty && !NextTickMutations.IsTileTidy(x, y)) {
							const weedChance = 0.002 * weedMultiplier;
							
							if (!tileChances["meddleweed"]) tileChances["meddleweed"] = { chances: [], tiles: [] };
							tileChances["meddleweed"].chances.push(weedChance);
							tileChances["meddleweed"].tiles.push({ x, y });
							
							continue;
						}
						
						// Possible mutations
						const { all, mature } = NextTickMutations.CountPlants(neighborCoords);
						const muts = garden.getMuts(all, mature);
						
						// Add tile chances
						for (const [plantKey, baseChance] of muts) {
							let adjustedChance = baseChance;
							const plant = garden.plantsById[keyToIdMap[plantKey]];
							
							// Skip if the plant is blocked by Tidygrass or Everdaisy
							if ((plant.fungus || plant.weed) && NextTickMutations.IsTileTidy(x, y)) continue;
							
							// Soil multiplier
							adjustedChance *= plantKey === "meddleweed" ? weedMultiplier : mutationMultiplier * dragonMultiplier;
							
							if (!tileChances[plantKey]) tileChances[plantKey] = { chances: [], tiles: [] };
							tileChances[plantKey].chances.push(adjustedChance);
							tileChances[plantKey].tiles.push({ x, y });
						}
					}
				}
				
				return tileChances;
			}
			
			// Gets the tile chances and converts it into the chance for each plant to spawn
			static GetPlantChances() {
				const tileChances = NextTickMutations.GetTileChances();
				const plantChances = {};
				
				// Get the overall chance of each plant
				for (const key in tileChances) {
					const { chances } = tileChances[key];
					let chanceOfNothing = 1;
					for (const chance of chances) chanceOfNothing *= (1 - chance);
					plantChances[key] = 1 - chanceOfNothing;
				}
				
				return plantChances;
			}
			
			// Checks for any plants that can only spawn on one tile and if those tiles are the same
			static GetMutationConflicts() {
				const tileChances = NextTickMutations.GetTileChances();
				const singleTileSeeds = [];
				const tileConflicts = []
				
				// Get plants that can only spawn on one tile
				for (const key in tileChances) {
					const data = tileChances[key];
					if (data && data.tiles.length === 1) singleTileSeeds.push({ key, tile: data.tiles[0] });
				}
				
				// Check for conflicts
				for (let i = 0; i < singleTileSeeds.length; i++) {
					var conflictsWithThisPlant = [];
					var plant = singleTileSeeds[i];
					
					for (let j = 0; j < singleTileSeeds.length; j++) {
						if(j === i) continue;
						
						const comparerPlant = singleTileSeeds[j];
						if (plant.tile.x === comparerPlant.tile.x && plant.tile.y === comparerPlant.tile.y) conflictsWithThisPlant.push(comparerPlant.key);
					}
					
					if(conflictsWithThisPlant.length > 0) tileConflicts.push({plant: plant.key, conflictors: conflictsWithThisPlant});
				}
				
				return tileConflicts;
			}
		}
		
		// ========== LUMP SCUM ==========
		
		class LumpScumUI {
			static possibleYield = [];
			static yieldIndex = 0;
			static lumpsEnabled = true;
			static scumButton;
			static cancelButton;
			static increaseButton;
			static decreaseButton;
			
			static DisplayLumps() {
				// Don't update if scumming
				if(LumpScum.scumming) return;
				
				// Clear display
				document.getElementById('possibleLumps').innerHTML = '';
				
				// Get chances
				const lumpChances = LumpScumUI.GetLumpChances();
				
				for(i = 0; i < 5; i++) {
				// Skip Meaty if Grandmapocalypse isn't active
				if(i === 3 && Game.elderWrath === 0) continue;
				
				const chance = lumpChances[i].toFixed(2)
				document.getElementById('possibleLumps').insertAdjacentHTML('beforeend', `
					<div id="possibleLump-${i}" class="gardenSeed" style="height: 50px;" onmouseover="Game.tooltip.wobble(); LumpScumUI.LumpTooltip(this, ${i}, ${chance});" onmouseout="Game.tooltip.shouldHide=1;" onclick="LumpScumUI.SelectLump(${i});">
						<div id="possibleLumpIcon-${i}" class="gardenSeedIcon shadowFilter" style="background:url(img/icons.png); background-position: ${LumpScumUI.GetLumpIcon(i, 0)};"></div>
						<div id="lumpLabel-${i}" style="text-align: center; margin-top: 40px; font-variant: none; font-weight: normal;">${chance}%</div>
					</div>`);
				}
				
				// Check what lump the user selected prior to display update
				if(LumpScum.selectedLump != -1) {
					// User selected Meaty but Grandmapocalypse isn't active
					if(LumpScum.selectedLump === 3 && Game.elderWrath === 0) {
						LumpScum.selectedLump = -1;
						
						// Stop the auto-scum
						if(LumpScum.scumWhenAvailable) LumpScum.StopAutoScum(4,0)
					}
					// All other cases are fine
					else LumpScumUI.SelectLump(LumpScum.selectedLump);
				}
			}
			
			// Gets the lump's icon given its id
			// Type means background position or icon array
			static GetLumpIcon(id, type) {
				if(type === 0) {
					if(id === 4) return `-1392px -1296px`;
					else return `-1392px ${-672 + (id * -48)}px`;
				}
				else {
					if(id === 4) return [29, 27];
					else return [29, 14 + id];
				}
			}
			
			// Returns the chance of each lump being the next one after harvest
			// Returns an array of chances in the format of [Normal, Bifurcated, Golden, Meaty, Caramelized]
			static GetLumpChances() {
				const dragonCurve = Game.dragonAura === 17 || Game.dragonAura2 === 17;
				const realityBending = Game.dragonAura === 18 || Game.dragonAura2 === 18;
				const grandmapocalypse = Game.elderWrath;
				
				// I cannot figure out the math so I'm copying from the wiki instead
				if(Game.Has('Sucralosia Inutilis')) {
					switch(Game.elderWrath) {
						case 0:
							if(dragonCurve && realityBending) return [83.2290,14.6245,0.2787,0,1.8678];
							else if(dragonCurve) return [83.9011,14.0387,0.2675,0,1.7927];
							else if(realityBending) return [90.7102,8.1022,0.1542,0,1.0334];
							else return [91.4668,7.4426,0.1416,0,0.9491];
							break;
						case 1:
							if(dragonCurve && realityBending) return [75.3857,13.6529,0.2606,8.9542,1.7465];
							else if(dragonCurve) return [76.2819,13.1566,0.2511,8.6277,1.6826];
							else if(realityBending) return [85.9595,7.7915,0.1484,5.1059,0.9947];
							else return [87.0348,7.1954,0.1370,4.7146,0.9183];
							break;
						case 2:
							if(dragonCurve && realityBending) return [68.1232,12.7381,0.2436,17.2628,1.6322];
							else if(dragonCurve) return [69.1708,12.3188,0.2355,16.6969,1.5780];
							else if(realityBending) return [81.2595,7.4853,0.1427,10.1559,0.9565];
							else return [82.6027,6.9483,0.1324,9.4291,0.8875];
							break;
						case 3:
							if(dragonCurve && realityBending) return [61.4319,11.8789,0.2276,24.9367,1.5248];
							else if(dragonCurve) return [62.5677,11.5252,0.2208,24.2076,1.4788];
							else if(realityBending) return [76.6104,7.1835,0.1371,15.1501,0.9189];
							else return [78.1707,6.7011,0.1278,14.1437,0.8567];
							break;
					}
				}
				else {
					switch(Game.elderWrath) {
						case 0:
							if(dragonCurve && realityBending) return [87.8334,9.9415,0.2889,0,1.9362];
							else if(dragonCurve) return [88.3470,9.5220,0.2766,0,1.8544];
							else if(realityBending) return [93.3704,5.4177,0.1573,0,1.0546];
							else return [93.9285,4.9617,0.1441,0,0.9657];
							break;
						case 1:
							if(dragonCurve && realityBending) return [79.3755,9.2734,0.2698,9.2734,1.8079];
							else if(dragonCurve) return [80.1658,8.9182,0.2594,8.9182,1.7384];
							else if(realityBending) return [88.4160,5.2091,0.1513,5.2091,1.0145];
							else return [89.3327,4.7970,0.1393,4.7970,0.9341];
							break;
						case 2:
							if(dragonCurve && realityBending) return [71.5534,8.6447,0.2518,17.8630,1.6871];
							else if(dragonCurve) return [72.5360,8.3449,0.2430,17.2479,1.6282];
							else if(realityBending) return [83.5168,5.0035,0.1455,10.3593,0.9750];
							else return [84.7368,4.6322,0.1346,9.5939,0.9025];
							break;
						case 3:
							if(dragonCurve && realityBending) return [64.3561,8.0547,0.2349,25.7808,1.5736];
							else if(dragonCurve) return [65.4576,7.8021,0.2275,24.9890,1.5239];
							else if(realityBending) return [78.6727,4.8009,0.1397,15.4507,0.9361];
							else return [80.1410,4.4674,0.1299,14.3909,0.8708];
							break;
					}
				}
			}
			
			// Returns the possible yield of this current lump
			static GetPossibleYield() {
				LumpScumUI.possibleYield = [];
				
				// Any yield
				LumpScumUI.possibleYield.push({yield: 'Any', chance: 1});
				
				// If not ripened, 50% chance of the yield being 0
				// Ripened mult will decrease the chance of all other yields by 50% to showcase this
				const ripened = Date.now() - Game.lumpT >= Game.lumpRipeAge;
				const ripenedMult = ripened ? 1 : 0.5;
				if(!ripened) LumpScumUI.possibleYield.push({yield: 0, chance: 0.5});
				
				switch(Game.lumpCurrentType) {
					case 0:
						// Normal
						LumpScumUI.possibleYield.push({yield: 1, chance: 1 * ripenedMult});
						break;
					case 1:
						// Bifurcated
						const mult = Game.Has('Sucralosia Inutilis') ? 0.05 : 0;
						LumpScumUI.possibleYield.push({yield: 1, chance: (0.5 - (0.5 * mult)) * ripenedMult}, {yield: 2, chance: (0.5 + (0.5 * mult)) * ripenedMult})
						break;
					case 2:
						// Golden
						for(i = 2; i < 8; i++) LumpScumUI.possibleYield.push({yield: i, chance: (1 / 6) * ripenedMult});
						break;
					case 3:
						// Meaty
						ripened ? LumpScumUI.possibleYield.push({yield: 0, chance: 0.4}) : LumpScumUI.possibleYield[LumpScumUI.possibleYield.findIndex(e => e.yield === 0)].chance = 0.7;
						LumpScumUI.possibleYield.push({yield: 1, chance: 0.2 * ripenedMult}, {yield: 2, chance: 0.4 * ripenedMult});
						break;
					case 4:
						// Caramelized
						for(i = 1; i < 4; i++) LumpScumUI.possibleYield.push({yield: i, chance: (1 / 3) * ripenedMult});
						break;
				}
			}
			
			// Increase yield button, moves forward in the yield array
			static IncreaseYield() {
				if(LumpScumUI.increaseButton.className === 'option off') return;
				LumpScumUI.yieldIndex = (LumpScumUI.yieldIndex + 1) % LumpScumUI.possibleYield.length;
				LumpScumUI.UpdateYield();
			}
			
			// Decrease yield button, moves backwards in the yield array
			static DecreaseYield() {
				if(LumpScumUI.decreaseButton.className === 'option off') return;
				LumpScumUI.yieldIndex = (LumpScumUI.yieldIndex - 1 + LumpScumUI.possibleYield.length) % LumpScumUI.possibleYield.length;
				LumpScumUI.UpdateYield();
			}
			
			// Updates the yield label based on the current index of the array
			static UpdateYield() {
				LumpScumUI.GetPossibleYield();
				const current = LumpScumUI.possibleYield[LumpScumUI.yieldIndex];
				document.getElementById('possibleYield').textContent = current.yield.toString();
				document.getElementById('yieldChance').textContent = `${(current.chance * 100).toFixed(2)}%`;
			}
			
			static SelectLump(lumpID) {
				// Only allow selection if lumps are enabled
				if(!LumpScumUI.lumpsEnabled) return;
				
				PlaySound('snd/toneTick.mp3');
				const possibleLump = lumpID === -1 ? document.getElementById(`possibleLump-any`) : document.getElementById(`possibleLump-${lumpID}`);
				
				if(possibleLump.className === 'gardenSeed on') {
					LumpScumUI.DeselectLumps();
					LumpScum.selectedLump = -1;
				}
				else {
					LumpScumUI.DeselectLumps();
					possibleLump.className = 'gardenSeed on';
					LumpScum.selectedLump = lumpID;
				}
			}
			
			// Shorthand to deselect all lumps
			static DeselectLumps = () => document.querySelectorAll('#possibleLumps .gardenSeed').forEach(lump => { lump.className = 'gardenSeed'; });
			
			// Tooltip for the lump selection
			static LumpTooltip(el, lumpID, chance) {
				Game.tooltip.draw(el, `
					<div style="padding:8px; text-align:left; width: 360px;">
						<div class="name">${lumpNames[lumpID]}</div>
						Your next sugar lump has a ${chance}% chance to be ${lumpNames[lumpID]}.
						<br>
						Click to select it for auto-scumming!
					</div>`, 0);
			}
			
			// Enables or disables lump selection
			static ToggleLumps(enable) {
				LumpScumUI.lumpsEnabled = enable;
				if(enable) document.querySelectorAll('#possibleLumps .gardenSeed').forEach(lump => { lump.style.opacity = 1; });
				else document.querySelectorAll('#possibleLumps .gardenSeed').forEach(lump => { lump.style.opacity = 0.25; });
			}
			
			// Toggles buttons based on whether a scum is active
			static ToggleButtons() {
				if(LumpScum.scumming || LumpScum.scumWhenAvailable) {
					LumpScumUI.scumButton.className = 'option off';
					LumpScumUI.cancelButton.className = 'option focused';
					LumpScumUI.decreaseButton.className = 'option off';
					LumpScumUI.increaseButton.className = 'option off';
					
					if(garden) {
						// Cancel button in the Lump UI should already be off
						GardenScumUI.reloadTickButton.className = 'option off';
						GardenScumUI.autoScumButton.className = 'option off';
					}
				}
				else {
					LumpScumUI.scumButton.className = 'option focused';
					LumpScumUI.cancelButton.className = 'option off';
					LumpScumUI.decreaseButton.className = 'option focused';
					LumpScumUI.increaseButton.className = 'option focused';
					
					if(garden) {
						// Don't turn the cancel button in the Garden UI on
						GardenScumUI.reloadTickButton.className = 'option focused';
						GardenScumUI.autoScumButton.className = 'option focused';
					}
				}
			}
			
			// Readies the auto-scum
			static StartScumButton() {
				// Scum is already active
				if(LumpScumUI.scumButton.className === 'option off') Game.Notify("An Auto-Scum is already set to be active!", "Turn it off with the cancel button.", [1,7]);
				else {
					// Auto-scum readies in the future
					if(Game.time - Game.lumpT < Game.lumpMatureAge) {
						Game.Prompt(`
							<div class="name">Note</div>
							<div class="line"></div>
							<div style="padding: 1em;">
								Your sugar lump is not yet ready to be harvested, but you may set up an auto-scum now so that Sugar Scum can start scumming for your desired lump in the future.
								<br>
								To prevent issues with save-scumming, the Garden Scum will be disabled until Sugar Scum has finished scumming your lump, or until the scum is cancelled.
							</div>
						`,[['Ready my Auto-Scum for the future','LumpScum.ReadyScum();Game.ClosePrompt();'],'Cancel']);
					}
					// Auto-scum readies now
					else LumpScum.ReadyScum();
				}
			}
			
			static CancelScumButton() {
				if(LumpScumUI.cancelButton.className === 'option focused') LumpScum.StopAutoScum(2,0);
				else Game.Notify("You have no Lump Scum to cancel!", "Convenient since you wanted to cancel?", [0,7]);
			}
			
			static UpdateScumLabel() {
				const label = document.getElementById('lumpScumLabel');
				
				// Display what the mod is scumming for
				if (LumpScum.scumming || LumpScum.scumWhenAvailable) {
					label.style = "color: #6f6; font-variant: none; font-weight:bold;";
					const nameText = LumpScum.selectedLump === -1 ? 'any lump' : `a ${lumpNames[LumpScum.selectedLump]} Sugar Lump`
					const yieldText = LumpScum.selectedYield === 'Any' ? "any yield" : `a yield of ${LumpScum.selectedYield}`;
					label.innerHTML = `Sugar Scum will scum your next lump for ${nameText} and ${yieldText}.`;
				}
				else {
					label.style = "color: white; font-variant: none; font-weight: normal;";
					label.innerHTML = "Sugar Scum is not set to auto-scum your next lump.";
				}
			}
			
			// Displays the current lump with a funny colour woohoo
			static UpdateCurrentLump() {
				const label = document.getElementById('currentLump');
				var colour = 'white';
				
				switch(Game.lumpCurrentType) {
					case 1:
						colour = 'blue';
						break;
					case 2:
						colour = 'yellow';
						break;
					case 3:
						colour = 'red';
						break;
					case 4:
						colour = 'orange';
						break;
				}
				
				label.style = `color: ${colour}; font-variant: none;`;
				label.innerHTML = `Your current Sugar Lump is ${lumpNames[Game.lumpCurrentType]}.`;
			}
			
			// Open and close the panel
			static TogglePanel() {
				const panel = document.getElementById('sugarScumLump');
				const button = document.getElementById('lumpScumProductButton');
				
				if (panel.style.display === 'none') {
					PlaySound('snd/clickOn2.mp3');
					panel.style.display = '';
					button.innerHTML = "Close Sugar Scum";
				}
				else {
					PlaySound('snd/clickOff2.mp3');
					panel.style.display = 'none';
					button.innerHTML = "Open Sugar Scum";
				}
			}
			
			static Build() {
				document.getElementById('buildingsMaster').insertAdjacentHTML('afterbegin', `
					<div id="sugarScumLump" class="framed" style="position: inherit; text-align: center; height: 250px; overflow-y: auto;">
						<div class="title gardenPanelLabel">
							<div style="font-variant: none; font-weight: normal;">Sugar Scum - Lumps</div>
						</div>
						<div class="line"></div>
						<div id="currentLump" style="font-variant: none;"></div>
						<div id="lumpScumLabel"></div>
						<div id="lumpScumContentPanel" style="display: flex; justify-content: space-between;">
							<div id="lumpContentLeft" style="padding: 1em; width: 33%;">
								<div class="title gardenPanelLabel">
									<div style="font-variant: none; font-weight: normal;">Desired Lump</div>
								</div>
								<div class="line"></div>
								<div id="lumpTypeLabel" style="margin-bottom: 10px; font-variant: none; font-weight: normal;">
									Your next lump may be one of the following:
									<br>
									<small>Note: You may leave this unselected if you don't want a specific lump type.</small>
								</div>
								<div id="possibleLumps" style="padding: 1em;  display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;"></div>
							</div>
							<div id="lumpContentMiddle" style="padding: 1em; width: 33%;">
								<div class="title gardenPanelLabel">
									<div style="font-variant: none; font-weight: normal;">Desired Yield</div>
								</div>
								<div class="line"></div>
								<div id="lumpYieldLabel" style="margin-bottom: 10px; font-variant: none; font-weight: normal;">Your current lump may yield a number of lumps within this range:</div>
								<div id="lumpYieldOption" style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px;">
									<a id="decreaseYield" class="option focused" style="margin: 0;" onclick="PlaySound('snd/tick.mp3'); LumpScumUI.DecreaseYield();"><</a>
									<div id="possibleYield" style="color: white; font-variant: none; font-weight: heavy; width: 30px;"></div>
									<a id="increaseYield" class="option focused" style="margin: 0;" onclick="PlaySound('snd/tick.mp3'); LumpScumUI.IncreaseYield();">></a>
								</div>
								<div id="yieldChance" style="font-variant: none; font-weight: normal;"></div>
							</div>
							<div id="lumpContentRight" style="padding: 1em; width: 33%; font-variant: none; font-weight: normal;">
								<div id="selectionLabel" style="margin-top: 30px; margin-bottom: 10px; text-align: left;">
									Choose what you'd like your next lump to be, as well as how many lumps you'd like your current one to yield upon harvest.
									<br>
									Then you can either start your auto-scum now, or tell Sugar Scum to start scumming as soon as your lump is ripe!
									<br>
									You can also cancel a future or active auto-scum.
								</div>
								<div id="scumButtons">
									<a id="lumpScumButton" class="option focused" style="margin: 0;" onclick="PlaySound('snd/tick.mp3'); LumpScumUI.StartScumButton();">Start Auto-Scum</a>
									<a id="cancelLumpScumButton" class="option off" style="margin: 0;" onclick="PlaySound('snd/tick.mp3'); LumpScumUI.CancelScumButton()">Cancel Scum</a>
								</div>
							</div>
						</div>
					</div>`);
				
				// Get buttons
				LumpScumUI.scumButton = document.getElementById('lumpScumButton');
				LumpScumUI.cancelButton = document.getElementById('cancelLumpScumButton');
				LumpScumUI.decreaseButton = document.getElementById('decreaseYield');
				LumpScumUI.increaseButton = document.getElementById('increaseYield');
				
				document.getElementById('buildingsMaster').insertAdjacentHTML('beforeend', `
					<div class="productButtons" style="bottom: -8px;">
						<div id="lumpScumProductButton" class="productButton" style="font-variant: none;" onclick="LumpScumUI.TogglePanel();">Close Sugar Scum</div>
					</div>`);
			}
		}
		
		class LumpScum {
			// By default the selected lump is -1, meaning any
			static selectedLump = -1;
			static selectedYield = null;
			static scumming = false;
			static scumWhenAvailable = false;
			static gameSave;
			static dragonMult = 0;
			static prevAura1 = null;
			static prevAura2 = null;
			static prevWrath = null;
			static prevLumpT = null;
			
			static StartAutoScum() {
				LumpScum.scumming = true;
				LumpScum.scumWhenAvailable = false;
				
				async function scumLoop() {
					let attempts = 0;
					let initialLumps = Game.lumps;
					LumpScum.gameSave = Game.WriteSave(1);
					
					while (LumpScum.scumming) {
						// Wait for the game to reload
						await new Promise(resolve => {
							const check = setInterval(() => {
								if (Game.lumps > -1) {
									clearInterval(check);
									resolve();
								}
							}, 50);
						});
						
						// Lump fully ripened and fell
						if(Game.time - Game.lumpT < Game.lumpMatureAge) {
							LumpScum.StopAutoScum(1, 0);
							break;
						}
						// Selected yield was zero but lump ripened
						// This is no longer a possible scum unless the current lump is Meaty
						else if(LumpScum.selectedYield === 0 && Game.time - Game.lumpT >= Game.lumpRipeAge && Game.lumpCurrentType != 3) {
							LumpScum.StopAutoScum(3, 0);
							break;
						}
						else {
							// Harvest lump
							Game.clickLump();
							attempts++;
							
							// Wait for game to load
							await new Promise(res => setTimeout(res, 50));
						}
						
						// Scum succeeds if:
						// Selected lump is any and selected yield is any (who tf is doing this it would be one click)
						// Selected lump is any and the current number of lumps minus the prev number of lumps is equal to the selected yield
						// The current lump is the same as the selected lump and the selected yield is any
						// The current lump is the same as the selected lump and the current number of lumps minus the prev number of lumps is equal to the selected yield
						if((LumpScum.selectedLump === -1 && LumpScum.selectedYield === 'Any') ||
						   (LumpScum.selectedLump === -1 && LumpScum.selectedYield === Game.lumps - initialLumps) ||
						   (LumpScum.selectedLump === Game.lumpCurrentType && LumpScum.selectedYield === 'Any') ||
						   (LumpScum.selectedLump === Game.lumpCurrentType && LumpScum.selectedYield === Game.lumps - initialLumps)) {
							LumpScum.StopAutoScum(0, attempts);
							break;
						}
						else Game.LoadSave(LumpScum.gameSave);
					}
				}
				
				// Start the loop
				scumLoop();
			}
			
			// Readies for auto-scum
			// This is called even if the lump is already able to be harvested just for simplicity
			// It just means the mod is told to start an auto-scum when the lump can be harvested and since the lump is ready it just instantly starts auto-scumming
			static ReadyScum() {
				LumpScum.scumWhenAvailable = true;
				LumpScumUI.ToggleLumps(false);
				LumpScumUI.DeselectLumps();
				LumpScumUI.ToggleButtons();
				LumpScum.selectedYield = LumpScumUI.possibleYield[LumpScumUI.yieldIndex].yield;
				LumpScumUI.UpdateScumLabel();
				
				if(garden) {
					GardenScumUI.DeselectSeeds();
					GardenScum.selectedSeeds = [];
					GardenScumUI.conflictingIDs = [];
					GardenScumUI.ToggleSeeds(false);
				}
				
				Game.Notify("Sugar Scum is now set to scum your next lump!", "Let there be glucose.", LumpScumUI.GetLumpIcon(LumpScum.selectedLump === -1 ? 0 : LumpScum.selectedLump, 1));
			}
			
			static StopAutoScum(reason, attempts) {
				switch(reason) {
					case 0:
						// Successful scum
						Game.Notify("Lump found!", `A ${lumpNames[Game.lumpCurrentType]} Sugar Lump has started coalescing after ${attempts} attempts.`, LumpScumUI.GetLumpIcon(Game.lumpCurrentType, 1));
						break;
					case 1:
						// Lump fell
						Game.Notify("Too Late.", "It took so long to scum your lump that it ended up falling.", [23,14]);
						break;
					case 2:
						// Cancelled scum
						Game.Notify("Scum Cancelled.", "");
						if(LumpScum.scumming) Game.LoadSave(LumpScum.gameSave);
						break;
					case 3:
						// Desired yield was 0 but the lump ripened and isn't Meaty
						Game.Notify("Scum no longer possible.", "You selected a desired yield of 0, but your Sugar Lump ripened and can no longer yield 0 lumps!", [23,14]);
						LumpScumUI.yieldIndex = 0;
						LumpScumUI.UpdateYield();
						Game.LoadSave(LumpScum.gameSave);
						break;
					case 4:
						// Desired lump was Meaty but the Grandmapocalypse was stopped
						Game.Notify("Scum no longer possible.", "You selected a Meaty Sugar Lump, but the Grandmapocalypse is no longer active!", [10,9]);
						break;
				}
				
				// Reset variables
				LumpScum.scumming = false;
				LumpScum.scumWhenAvailable = false;
				LumpScum.selectedLump = -1;
				
				// Update display
				LumpScumUI.ToggleLumps(true);
				LumpScumUI.ToggleButtons();
				LumpScumUI.DisplayLumps();
				LumpScumUI.UpdateScumLabel();
				
				if(garden) {
					GardenScumUI.ToggleSeeds(true);
					GardenScumUI.DisplaySeeds();
				}
			}
			
			// Checks the status of the lump and other factors
			static CheckLump() {
				// Aura check (always slay)
				const currentAuraMult = Game.auraMult('Dragon\'s Curve');
				if(currentAuraMult != LumpScum.dragonMult) {
					// Update chances if dragon aura changed
					LumpScum.dragonMult = currentAuraMult;
					LumpScumUI.DisplayLumps();
				}
				
				// Grandma check
				if(LumpScum.prevWrath != Game.elderWrath) {
					// Update chances if Grandmapocalypse phase changed
					LumpScum.prevWrath = Game.elderWrath;
					LumpScumUI.DisplayLumps();
				}
				
				// Lump is ready to be auto-scummed
				if(Game.time - Game.lumpT > Game.lumpMatureAge && LumpScum.scumWhenAvailable) LumpScum.StartAutoScum();
				
				// New lump
				if(LumpScum.prevLumpT != Game.lumpT) {
					LumpScum.prevLumpT = Game.lumpT;
					LumpScumUI.UpdateCurrentLump();
					LumpScumUI.yieldIndex = 0;
					LumpScumUI.UpdateYield();
				}
			}
		}

		// ========== INITIALIZATION ==========

		window.GardenScumUI = GardenScumUI;
		window.GardenScum = GardenScum;
		window.NextTickMutations = NextTickMutations;
		window.LumpScumUI = LumpScumUI;
		window.LumpScum = LumpScum;
		
		// Garden variables
		const garden = Game.Objects.Farm.minigame;
		const keyToIdMap = {};
		
		// Lump variables
		const lumpNames = ['Normal', 'Bifurcated', 'Golden', 'Meaty', 'Caramelized'];
		
		// Garden init
		if(Game.canLumps()) {
			if(garden) {
				Object.keys(Game.Objects.Farm.minigame.plants).forEach((key, i) => { keyToIdMap[key] = i; });
				GardenScumUI.Build();
				GardenScumUI.UpdateSaveCode();
				GardenScumUI.DisplaySeeds();
				GardenScumUI.UpdateScumLabel();
				setInterval(GardenScum.CheckGarden, 100);
			}
			else Game.Prompt(`
				<div class="name">Note</div>
				<div class="line"></div>
				<div style="padding: 1em;">
					You don't have a Garden yet!
					<br>
					Sugar Scum is still able to work, but only for your lumps.
					<br>
					If you purchase a Garden while Sugar Scum is loaded, please reload the mod.
				</div>`,['Okay']);
			
			// Lump init
			LumpScumUI.Build();
			LumpScumUI.DisplayLumps();
			LumpScumUI.UpdateYield();
			LumpScumUI.UpdateScumLabel();
			LumpScumUI.UpdateCurrentLump();
			setInterval(LumpScum.CheckLump, 100);
			
			Game.Notify("Sugar Scum loaded!", "Let there be Lumps.", [25,15]);
		}
		else Game.Notify("Sugar Scum failed to load.", "You can't coalesce Sugar Lumps yet!", [17,5]);
	}
});
