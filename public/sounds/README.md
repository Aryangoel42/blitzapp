# Focus Sound Files

This directory contains focus sound files for the Pomodoro timer. To add your own sounds:

## Required Sound Files

Place the following MP3 files in this directory:

- `ambience.mp3` - Gentle background atmosphere (cafe sounds, distant chatter)
- `white-noise.mp3` - Consistent background noise (fan, static)
- `rain.mp3` - Soothing rain sounds (light rain, thunder)
- `fire.mp3` - Crackling fireplace sounds (wood burning, embers)
- `wind.mp3` - Gentle wind through trees (rustling leaves)
- `ocean.mp3` - Calming ocean waves (beach sounds)
- `forest.mp3` - Nature sounds from the forest (birds, insects)

## Audio Requirements

- **Format**: MP3 (recommended) or WAV
- **Duration**: 10-30 seconds (will loop seamlessly)
- **Quality**: 128kbps or higher
- **Volume**: Normalized to -16dB LUFS for consistent levels
- **Loop**: Ensure the end fades smoothly into the beginning

## Free Sound Resources

- [Freesound.org](https://freesound.org/) - Creative Commons licensed sounds
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects library
- [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) - BBC archive sounds

## Custom Sounds

You can add your own sounds by:
1. Adding the file to this directory
2. Updating the `getSoundUrl` function in `src/lib/focusSounds.ts`
3. Adding the sound type to the `FocusSound` type definition

## Note

The current implementation includes fade-in/fade-out effects and seamless looping. Make sure your audio files are properly prepared for looping to avoid audio artifacts.
