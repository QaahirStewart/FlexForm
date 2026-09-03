---
name: flexform-exercise-illustrator
description: Generate consistent FlexForm exercise hero illustrations from the project's master 4-Day Gym Plan reference. Use for new exercise-library artwork, replacement exercise images, or movement illustration batches; do not use for UI screenshots or unrelated fitness photography.
---

# FlexForm Exercise Illustrator

Create one original, project-bound illustration per exercise. Never crop the master infographic, reuse another movement's art, or add typography inside the image.

## Required inputs

Collect or derive these fields before generation:

- exercise name
- equipment
- start position
- finish position
- movement direction
- primary muscles
- secondary muscles
- collection accent: push blue, lower green, pull purple, posterior orange, or a supplied category color

Use `assets/master-reference.png` as the visual reference. It is a style and character anchor, not an edit target.

## Generation contract

Use the built-in image-generation tool with the `scientific-educational` use case. Issue a separate call for every exercise.

Read [references/prompt-template.md](references/prompt-template.md) before generating. Read [references/anatomy-map.md](references/anatomy-map.md) when choosing highlight placement or when an exercise has ambiguous primary and secondary targets.

Every result must have:

- pure white background and generous empty margins
- the same athletic adult male character as the master reference: warm medium skin, short dark hair, muscular but believable proportions, black athletic clothing
- a horizontal left-to-right demonstration with the start pose on the left, one simple dark navy arrow in the center, and finish pose on the right
- accurate equipment, hand placement, joint alignment, and range of motion
- two small anatomical figures below the movement: front and back
- strongest color on primary muscles, lighter color on secondary muscles, neutral gray elsewhere
- consistent semi-realistic infographic rendering, crisp line work, controlled shading, and soft grounding shadows
- no title, instructions, labels, letters, numbers, borders, logos, watermark, or random text

## Quality gate

Inspect every output before saving it. Reject or regenerate when any check fails:

1. The illustration depicts the requested exercise and correct equipment.
2. Start and finish positions are in the requested left-to-right order.
3. Grip, joints, bar path, cable path, bench, rack, and machine geometry are plausible.
4. The same character appears in both movement poses and both anatomy figures.
5. Primary and secondary highlights match the exercise specification; unrelated muscles stay neutral.
6. Hands, feet, limbs, plates, cables, benches, and machines are complete and not malformed.
7. The canvas contains no accidental text, labels, border, logo, or watermark.
8. The composition remains readable when cropped into a mobile exercise card.

Make one targeted regeneration when an output fails. Repeat the failed invariant verbatim and preserve everything that already works.

## Saving

Save accepted assets under `public/exercises/generated/<exercise-id>.png`. Use stable kebab-case identifiers. Do not overwrite an accepted asset unless replacement is explicitly requested; use a versioned sibling while reviewing.

Report the final saved paths and the exercise-specific prompt set.
