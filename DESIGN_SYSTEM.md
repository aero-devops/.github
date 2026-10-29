# Aero visual system

## The idea

Aero is named for air, and air is invisible. So Aero's images never draw air as lines. They show what air does: where it rushes, where it stalls, where it turns, and what it carries away. Brightness is speed or density, and every gradient starts from a real source in the picture.

Each image is a **plate**, a composed print with one idea. Plates are computed from a flow model (`scripts/air.mjs`, `scripts/flow.mjs`) rather than drawn by hand, so their physics stays consistent. The grain is dithering: error diffusion (Bill Atkinson's 1-bit Macintosh method) or an ordered Bayer pattern. That makes a gradient look like a printed photograph rather than a texture laid over a shape.

References: 1-bit Macintosh art as revived in Lucas Pope's *Return of the Obra Dinn*; smoke-tunnel and wind-tunnel photography (Van Dyke's *An Album of Fluid Motion*, flowvis.org); wind maps.

## The plates

Each plate is justified by what its subject does. A new part of Aero gets a new plate with its own logic, never a recoloured copy of another.

| Plate | Subject | Logic | Inks |
| --- | --- | --- | --- |
| 1 **Pressure** | Aero | The name is held in moving air. Brightness is air speed: bright where the air rushes over and under the name, dark where it stalls in front and behind, rings of fast air around each vortex's still eye. The wake dies out before the frame. | four |
| 2 **Release** | Core | Core is where services are released from. Each service is a jet leaving the name, spreading and thinning as it travels. Jets that climb toward the edge thin out before they reach it. | two |
| 3 **Break-up** | Shell | The incoming charge *is* the word. The S is whole; each later letter has lost more pixels to the stream; the pieces gather into one wave, the process's output. | two |
| 4 **Wind** | Open air | Short marks traced along the real flow, only where the air is disturbed. It has no name in it yet; it stands for what Aero hasn't built. Calm air sits in graphite, disturbed air rises to chalk. | four |

**The mark** is the lowercase a in Pixelify Sans and nothing else, chalk on ink, at every size from the avatar to the favicon. The plates carry the air; the mark only names.

**The dashboard** uses Plate 2's logic live. Each running service is a jet with puffs travelling down it. A stopping service's jet comes loose from its source and drifts off. A stopped service is still air, and a failed one leaves a short puff that scatters.

## Rules

1. **Air is tone, never outline.** Don't draw streamlines, contour lines or hard one-pixel strokes. Dense line fields are tiring to look at and were rejected.
2. **Letters don't compete with grain.** Solid letters keep a band of clear ink around them. Otherwise the letters are built from the medium, as in Plate 3, where the word itself breaks up.
3. **Nothing is cut by the frame.** Every jet, wake and wave thins or dissipates before the edge. A shape clipped by the border reads as a mistake.
4. **Air moves left to right.** Input enters on the left, the subject sits in the stream, and output leaves on the right.
5. **Choose two inks or four for a reason.** Two inks (ink, chalk) suit plates made of a single substance: jets, the breaking word. Four inks (ink, graphite, ash, chalk) suit plates of whole fields, where grey keeps the air quiet so only its strongest moments reach chalk.
6. **Check before showing.** Look at every export at full size and at its real display size (avatar at 40 px, social card as a thumbnail) before anyone else sees it.

## Inks

| Ink | Value | Use |
| --- | --- | --- |
| Ink | `#080808` | Background, still air |
| Graphite | `#3A3A37` | Calm air in four-ink plates |
| Ash | `#8E8E88` | Moving air in four-ink plates; secondary text such as plate labels and notes |
| Chalk | `#F5F5F0` | Letters, the fastest air, primary text |

There is no accent colour, and nothing is tinted. Grey is either one of the four inks or produced by dithering between neighbouring inks.

## Type and grid

- **Pixelify Sans** for names: the wordmark, plate titles, and page and service headings. In plates, letters are rasterized from the font outlines straight onto cells. In CSS, Pixelify is set only at sizes where one font pixel is a whole number of px (22, 33, 44, 66 or 88 px).
- **Space Mono** for everything else: captions, prose, code, controls and numbers. Everything is in sentence case; nothing is set in all capitals.
- One cell is 4 px on banners, previews, the site and the dashboard. Rules and borders are one cell thick. Spacing is a multiple of the cell.

## Captions

A plate's caption sits below the picture, outside the air. It gives the plate number and name in ash and says what the software does in chalk: "Plate 2 Release · Core starts, stops and watches named services from one local dashboard."

## Assets

`npm run export` (in this folder) writes:

| File | Size | Plate | Used for |
| --- | --- | --- | --- |
| `assets/avatar.png` | 512² | the a | GitHub organization avatar |
| `assets/favicon.png` | 64² | whole a | Site and dashboard favicon |
| `assets/org-banner.png` | 1600×600 | 1 Pressure | Profile README |
| `assets/website-social.png` | 1280×640 | 4 Wind | Website link card |
| `../core/docs/banner.png`, `social-preview.png` | 1600×600, 1280×640 | 2 Release | Core README and GitHub social preview |
| `../shell/docs/banner.png`, `social-preview.png` | 1600×600, 1280×640 | 3 Break-up | Shell README and GitHub social preview |
| `../site/assets/plate-*.png`, `social.png`, `favicon.png` | various | 1–4 | Website |

Exports are PNGs with two or four colours, a few KB each. Show them with `image-rendering: pixelated`. The dashboard screenshot (`core/docs/dashboard.png`) is taken from the running demo.

`studies/prints/` keeps the review sheets that chose this direction.

## Don't

- Don't draw air as lines, or swap a line for a dithered line and call it new.
- Don't put a letter on top of grain and call it a composition.
- Don't let the frame cut a shape.
- Don't add an accent colour, gradient fill, glow, shadow or rounded corner.
- Don't hand-edit an exported PNG. Change the plate and re-export.
