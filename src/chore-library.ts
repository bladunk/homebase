export const choreCategories = ['Kitchen', 'Bathrooms', 'Bedrooms', 'Floors', 'Laundry', 'Pets', 'Baby care', 'Appliances', 'Vehicles', 'Seasonal maintenance'] as const
export type ChoreCategory = typeof choreCategories[number]

export const references = {
  cdcHome: { publisher: 'CDC', title: 'When and how to clean and disinfect your home', url: 'https://www.cdc.gov/hygiene/about/when-and-how-to-clean-and-disinfect-your-home.html' },
  cdcBaby: { publisher: 'CDC', title: 'Clean, sanitize, and store infant feeding items', url: 'https://www.cdc.gov/hygiene/about/clean-sanitize-store-infant-feeding-items.html' },
  cdcPump: { publisher: 'CDC', title: 'How to clean and sanitize breast pumps', url: 'https://www.cdc.gov/hygiene/about/about-breast-pump-hygiene.html' },
  cdcPets: { publisher: 'CDC', title: 'Cleaning and disinfecting pet supplies', url: 'https://www.cdc.gov/healthy-pets/about/cleaning-and-disinfecting-pet-supplies.html' },
  aci: { publisher: 'American Cleaning Institute', title: 'Home cleaning routine', url: 'https://www.cleaninginstitute.org/cleaning-tips/clean-home/home-cleaning-routine' },
  aciLevels: { publisher: 'American Cleaning Institute', title: 'Levels of cleaning for better health', url: 'https://www.cleaninginstitute.org/cleaning-levels' },
  aciBasics: { publisher: 'American Cleaning Institute', title: 'Cleaning 101', url: 'https://www.cleaninginstitute.org/home/cleaning-101' },
  nsf: { publisher: 'NSF', title: 'Clean the germiest home items', url: 'https://www.nsf.org/consumer-resources/articles/clean-germiest-home-items' },
  food: { publisher: 'FoodSafety.gov', title: 'Four steps to food safety', url: 'https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety' },
  whirlpoolDish: { publisher: 'Whirlpool', title: 'How to clean a dishwasher filter', url: 'https://www.whirlpool.com/blog/kitchen/fixing-removing-and-replacing-dishwasher-filters.html' },
  whirlpoolCare: { publisher: 'Whirlpool', title: 'Home maintenance checklist for every season', url: 'https://www.whirlpool.com/blog/kitchen/home-maintenance-checklist.html' },
  samsung: { publisher: 'Samsung', title: 'How to clean your Samsung dryer', url: 'https://www.samsung.com/us/support/answer/ANS10001019/' },
  keurig: { publisher: 'Keurig', title: 'Using and caring for your K-Elite', url: 'https://www.keurig.com/hub/support/how-to-use-keurig-k-elite' },
  kidde: { publisher: 'Kidde', title: 'Smoke alarm maintenance', url: 'https://www.kidde.com/safety-hub/smoke-and-co-detection/smoke-detector-maintenance-how-to-clean-test-and-care-for-your-alarms' },
  nhtsa: { publisher: 'NHTSA', title: 'TireWise tire safety', url: 'https://www.nhtsa.gov/vehicle-safety/tires' },
  energy: { publisher: 'ENERGY STAR', title: 'Heat and cool efficiently', url: 'https://www.energystar.gov/saveathome/heating-cooling' },
} as const

export type Reference = { id: keyof typeof references; supports: 'cadence' | 'method' | 'context'; note?: string }
export const conditions = {
  bedroom: 'At least one bedroom', children: 'Children at home', baby: 'Infant at home', bottles: 'Infant feeding items', pump: 'Breast pump',
  diaper: 'Diaper station', dog: 'Dog', cat: 'Cat', pet: 'Dog or cat', wetFood: 'Wet pet food',
  hard: 'Hard floors', carpet: 'Carpet or rugs', dishwasher: 'Dishwasher', washer: 'Washing machine',
  dryer: 'Tumble dryer', coffee: 'Coffee maker', keurig: 'Keurig K-Elite', oven: 'Oven',
  microwave: 'Microwave', hvac: 'Serviceable HVAC filter', robot: 'Robot vacuum',
  vehicle: 'Vehicle', yard: 'Yard', exterior: 'Responsible for the building exterior', fireplace: 'Fireplace or chimney',
} as const
export type Condition = keyof typeof conditions

export const cadences = {
  daily: 'Daily', weekly: 'Weekly', fortnight: 'Every 2 weeks', monthly: 'Monthly',
  quarterly: 'Every 3 months (approx.)', semiannual: 'Every 6 months (approx.)', annual: 'Yearly (approx.)',
  afterUse: 'After each use', asNeeded: 'As needed',
} as const
export type Cadence = keyof typeof cadences
export type Priority = 'critical' | 'high' | 'normal' | 'low'
export type ChoreTemplate = {
  id: string; name: string; category: ChoreCategory; cadence: Cadence; minutes: number; priority: Priority
  conditions: Condition[]; tier: 'core' | 'standard' | 'deep'; instructions: string; references: Reference[]; aliases: string[]
}

const reference = (id: Reference['id'], supports: Reference['supports'], note?: string): Reference => ({ id, supports, note })
const cadence = (id: Reference['id'], note?: string) => reference(id, 'cadence', note)
const method = (id: Reference['id'], note?: string) => reference(id, 'method', note)
const scope = (id: Reference['id'], note: string) => reference(id, 'context', note)

type Entry = [
  id: string, name: string, repeat: Cadence, minutes: number, priority: Priority, matches: Condition[],
  tier: ChoreTemplate['tier'], instructions: string, sources?: Reference[], aliases?: string[],
]
function group(category: ChoreCategory, entries: Entry[]): ChoreTemplate[] {
  return entries.map(([id, name, repeat, minutes, priority, matches, tier, instructions, sources = [], aliases = []]) =>
    ({ id, name, category, cadence: repeat, minutes, priority, conditions: matches, tier, instructions, references: sources, aliases }))
}

export const choreLibrary = [
  ...group('Kitchen', [
    ['dishes', 'Wash dishes', 'daily', 10, 'high', [], 'core', 'Clear leftover food, wash dishes or run the dishwasher, and put away dry items.', [cadence('aci')], ['Dishes', 'Do dishes', 'Run dishwasher', 'Wash the dishes']],
    ['counters', 'Wipe kitchen counters', 'daily', 4, 'high', [], 'core', 'Clear crumbs and clean with a surface-safe product. Wash food-prep surfaces after each use, especially after raw ingredients.', [cadence('aci'), method('food')], ['Clean kitchen counters', 'Wipe countertops']],
    ['cutting-boards', 'Wash cutting boards', 'afterUse', 3, 'critical', [], 'standard', 'Wash boards with hot soapy water after use. Keep boards for raw meat or seafood separate from boards for ready-to-eat foods.', [cadence('food')]],
    ['dining-table', 'Wipe dining table', 'daily', 3, 'normal', [], 'standard', 'Remove dishes and crumbs. Wipe after meals with a cleaner approved for the tabletop.', [cadence('aci')]],
    ['kitchen-sink', 'Clean kitchen sink', 'weekly', 6, 'high', [], 'core', 'Clean the basin and rim with a suitable product. Rinse away residue and clean the strainer.', [cadence('nsf', 'NSF suggests once or twice a week for the sink.')]],
    ['cloths', 'Change kitchen cloths', 'daily', 4, 'high', [], 'standard', 'Rotate soiled cloths promptly and launder them according to the care label. Keep fresh cloths on hand.', [cadence('nsf', 'NSF suggests rotating washable kitchen linens every one or two days.')]],
    ['sponges', 'Check kitchen sponge or brush', 'weekly', 2, 'normal', [], 'standard', 'Replace a worn or smelly sponge. Clean reusable brushes according to their instructions.', [scope('nsf', 'NSF identifies sponges and dish rags as items that merit attention. The reminder interval is a HomeBase default.')]],
    ['stovetop', 'Clean cooktop', 'weekly', 8, 'normal', [], 'core', 'Once the cooktop is cool, remove spills with the method recommended for its surface.', [method('whirlpoolCare')]],
    ['fridge-review', 'Review refrigerator contents', 'weekly', 6, 'high', [], 'core', 'Review dates and label leftovers. Consult official storage guidance when deciding what to keep.', [scope('food', 'Food storage guidance. HomeBase proposes a weekly inventory review.')]],
    ['fridge-shelves', 'Wipe refrigerator shelves', 'monthly', 12, 'normal', [], 'standard', 'Clean one shelf at a time and dry it before refilling. Clean leaks promptly and keep food properly chilled.', [method('whirlpoolCare')]],
    ['pantry-shelves', 'Check pantry shelves', 'monthly', 10, 'normal', [], 'standard', 'Look for damaged packages, spills, and expired products. Place older usable items where you can see them.'],
    ['trash', 'Empty kitchen trash', 'asNeeded', 4, 'normal', [], 'standard', 'Empty a full bag and fit a clean liner. Clean spills in the bin when they occur.'],
    ['bin-wash', 'Wash kitchen bin', 'monthly', 8, 'low', [], 'deep', 'Wipe inside and outside, rinse as appropriate, and let the bin dry before relining.'],
  ]),
  ...group('Bathrooms', [
    ['toilet', 'Clean toilet', 'weekly', 8, 'high', [], 'core', 'Clean the bowl and wipe the seat, handle, and exterior with products intended for those surfaces.', [cadence('aciLevels')], ['Scrub toilet', 'Clean the toilet']],
    ['bath-sink', 'Clean bathroom sink', 'weekly', 6, 'normal', [], 'core', 'Remove items from the vanity, clean the basin and tap, and dry the counter.', [cadence('aciLevels')]],
    ['shower', 'Clean shower or tub', 'weekly', 12, 'normal', [], 'core', 'Use a surface-safe cleaner to remove residue. Rinse and leave the space open to dry.', [cadence('aciLevels'), method('aci')]],
    ['bath-mirror', 'Clean bathroom mirror', 'weekly', 3, 'low', [], 'standard', 'Wipe away spots with a glass-safe product and buff with a lint-free cloth.'],
    ['toothbrush-holder', 'Wash toothbrush holder', 'weekly', 4, 'normal', [], 'standard', 'Empty and wash the holder, using the dishwasher only if marked safe. Let it dry before refilling.', [cadence('nsf', 'NSF suggests once or twice a week for toothbrush holders.')]],
    ['bath-handles', 'Wipe bathroom handles', 'daily', 3, 'normal', [], 'standard', 'Clean handles and switches with a surface-compatible method. Avoid getting liquid into switches.', [method('cdcHome', 'CDC advises cleaning high-touch surfaces regularly. The daily interval is a HomeBase default.')]],
    ['bathmat', 'Wash bath mats', 'weekly', 6, 'normal', [], 'standard', 'Check the backing and care label, then wash and dry mats completely before returning them.', [cadence('aciBasics')]],
    ['shower-curtain', 'Wash shower curtain', 'quarterly', 10, 'low', [], 'deep', 'Remove the curtain and liner. Clean each according to its label and hang them to dry.', [method('aci')]],
    ['hair-strainer', 'Clear shower strainer', 'weekly', 3, 'normal', [], 'standard', 'Remove accessible hair and debris, then wash and reseat the removable strainer.'],
    ['vanity-stock', 'Restock bathroom supplies', 'weekly', 4, 'low', [], 'standard', 'Check soap and toilet paper, refill what is low, and add replacements to your shopping list.'],
    ['bathroom-drawers', 'Reset vanity drawers', 'quarterly', 12, 'low', [], 'deep', 'Empty one drawer, wipe and dry it, and put regularly used items back within reach.'],
  ]),
  ...group('Bedrooms', [
    ['sheets', 'Change bedsheets', 'fortnight', 12, 'normal', ['bedroom'], 'core', 'Strip the bed, launder sheets using the care labels, and put on a clean set.', [cadence('aciLevels', 'ACI suggests washing sheets at least every other week.')], ['Change sheets', 'Change bed sheets', 'Wash bed sheets', 'Wash bedsheets', 'Change linens']],
    ['bedroom-dust', 'Dust bedroom surfaces', 'weekly', 7, 'normal', ['bedroom'], 'core', 'Dust reachable shelves and dressers before cleaning the floor.', [cadence('aci')]],
    ['bedside', 'Clear bedside tables', 'weekly', 4, 'low', ['bedroom'], 'standard', 'Return cups and books to their places, then wipe the cleared surfaces.'],
    ['bedroom-clutter', 'Reset bedroom clutter', 'daily', 5, 'low', ['bedroom'], 'standard', 'Put clothes in the hamper and return loose items to their homes.'],
    ['under-bed', 'Vacuum under beds', 'monthly', 10, 'low', ['bedroom'], 'deep', 'Move loose items and vacuum reachable areas with the appropriate attachment.'],
    ['pillows', 'Launder washable pillows', 'quarterly', 10, 'low', ['bedroom'], 'deep', 'Check whether each pillow is washable. Follow its instructions and dry thoroughly.', [method('aci')]],
    ['duvet', 'Wash duvet cover', 'monthly', 10, 'low', ['bedroom'], 'standard', 'Remove the cover and fasten closures before laundering according to the label.'],
    ['mattress', 'Check mattress and protector', 'quarterly', 12, 'low', ['bedroom'], 'deep', 'Check for spills or wear and follow the manufacturer’s cleaning and rotation instructions.', [scope('aci', 'ACI lists mattress cleaning in its yearly home routine. This is a separate inspection reminder.')]],
    ['closet', 'Review one closet shelf', 'monthly', 12, 'low', ['bedroom'], 'deep', 'Remove items from one shelf, dust it, and set aside items you no longer use.'],
    ['bedroom-blinds', 'Dust bedroom blinds', 'monthly', 8, 'low', ['bedroom'], 'deep', 'Close and dust slats, then rotate them and wipe the other side if the material allows.', [method('aci')]],
    ['linens-count', 'Check spare linens', 'quarterly', 7, 'low', ['bedroom'], 'deep', 'Match spare sheets to bed sizes and set worn pieces aside.'],
  ]),
  ...group('Floors', [
    ['vacuum', 'Vacuum carpets and rugs', 'weekly', 15, 'normal', ['carpet'], 'core', 'Pick up small objects and vacuum with the setting appropriate to the carpet or rug.', [cadence('aci')], ['Vacuuming', 'Vacuum', 'Vacuum floors', 'Vacuum the house']],
    ['mop', 'Mop hard floors', 'weekly', 15, 'normal', ['hard'], 'core', 'Remove grit first. Mop with a finish-safe product and use only as much moisture as the flooring allows.', [cadence('aci')], ['Mop floors', 'Mopping', 'Mop the floors']],
    ['sweep', 'Sweep high-traffic floors', 'daily', 5, 'normal', ['hard'], 'core', 'Sweep crumbs and grit from entryways and other busy areas.', [cadence('aci')], ['Sweep floors']],
    ['entry-mat', 'Clean entry mats', 'weekly', 5, 'low', [], 'standard', 'Shake out or vacuum entry mats according to the material and let damp mats dry.', [scope('aci', 'ACI recommends entry mats to catch dirt. Weekly upkeep is a HomeBase default.')]],
    ['floor-spills', 'Spot-clean floor spills', 'asNeeded', 4, 'normal', [], 'standard', 'Blot new spills promptly and use a cleaner compatible with the flooring.', [method('aci')]],
    ['baseboards', 'Wipe baseboards', 'quarterly', 12, 'low', [], 'deep', 'Dust baseboards, then wipe marks with a cloth suitable for the finish.', [method('aci')]],
    ['stairs', 'Clean stairs and landings', 'weekly', 10, 'normal', [], 'deep', 'Clear objects and clean one step at a time using the equipment suited to the stair finish.'],
    ['rug-edges', 'Vacuum rug edges', 'monthly', 6, 'low', ['carpet'], 'deep', 'Use a suitable attachment along edges and avoid sucking in fringe.'],
    ['furniture-floor', 'Clean under movable furniture', 'monthly', 12, 'low', [], 'deep', 'Move only furniture you can handle safely and clean the exposed floor.'],
    ['floor-protectors', 'Check furniture floor pads', 'quarterly', 6, 'low', ['hard'], 'deep', 'Check for missing or gritty pads and replace them before sliding furniture.'],
    ['rug-clean', 'Plan deeper rug cleaning', 'annual', 10, 'low', ['carpet'], 'deep', 'Read rug care instructions and choose a suitable spot-cleaning or professional service method.', [cadence('aci')]],
  ]),
  ...group('Laundry', [
    ['laundry', 'Do laundry', 'weekly', 12, 'normal', [], 'core', 'Sort by care labels, wash and dry appropriately, and put away the clean load. Estimate covers hands-on time.', [method('aci', 'ACI treats frequency as need-based. Weekly is a HomeBase starter reminder.')], ['Laundry', 'Wash clothes', 'Load laundry']],
    ['fold', 'Fold and put away laundry', 'asNeeded', 10, 'normal', [], 'standard', 'Fold or hang clean dry clothes, then return them to their usual places.'],
    ['towels', 'Wash towels', 'weekly', 7, 'normal', [], 'core', 'Collect used towels and wash and dry them according to their labels.', [cadence('aciBasics')]],
    ['hamper', 'Clean clothes hamper', 'monthly', 5, 'low', [], 'standard', 'Empty the hamper and clean its lining or surface using a compatible method.', [method('cdcHome')]],
    ['stains', 'Pretreat clothing stains', 'asNeeded', 5, 'normal', [], 'standard', 'Check the garment and product labels, treat fresh stains promptly, and inspect before drying.', [method('aci')]],
    ['air-dry', 'Put away air-dried items', 'asNeeded', 6, 'low', [], 'standard', 'Check seams and waistbands for moisture before folding or storing.'],
    ['delicates', 'Wash delicates', 'fortnight', 8, 'low', [], 'deep', 'Sort delicate items and choose hand-washing or a machine cycle according to care labels.'],
    ['sports-kit', 'Wash children’s activity clothes', 'weekly', 8, 'normal', ['children'], 'standard', 'Empty pockets, check labels, and wash uniforms or activity clothes.'],
    ['laundry-supplies', 'Check laundry supplies', 'monthly', 4, 'low', [], 'standard', 'Check detergent and other regularly used items. Store products in original packaging and follow labels.'],
    ['laundry-shelf', 'Wipe laundry shelf', 'monthly', 5, 'low', [], 'deep', 'Move supplies, remove residue with a compatible cleaner, and dry the shelf.'],
    ['ironing', 'Check ironing equipment', 'quarterly', 5, 'low', [], 'deep', 'Let the iron cool and inspect the cord and soleplate. Follow its manual for cleaning.'],
  ]),
  ...group('Pets', [
    ['pet-water', 'Wash pet water bowl', 'daily', 3, 'high', ['pet'], 'core', 'Wash and rinse the bowl, then refill it with fresh water. Use the dishwasher only if the bowl is labeled safe.', [cadence('cdcPets')]],
    ['pet-dry-bowl', 'Wash dry-food bowl', 'daily', 3, 'high', ['pet'], 'standard', 'Wash the bowl with soapy water, rinse, and let it dry before refilling.', [cadence('cdcPets')]],
    ['pet-wet-bowl', 'Wash wet-food bowl', 'afterUse', 3, 'critical', ['pet', 'wetFood'], 'core', 'Remove leftovers and wash and rinse the bowl after every use.', [cadence('cdcPets')]],
    ['pet-bedding', 'Wash pet bedding', 'weekly', 10, 'normal', ['pet'], 'core', 'Remove loose hair, then follow the label for washing and drying the bedding.', [cadence('cdcPets')]],
    ['pet-toys', 'Clean pet toys', 'monthly', 10, 'normal', ['pet'], 'standard', 'Check toy-care labels. Clean washable toys and discard damaged or soiled toys that cannot be cleaned.', [cadence('cdcPets')]],
    ['litter', 'Scoop litter box', 'daily', 5, 'critical', ['cat'], 'core', 'Remove waste and wash hands afterward. Follow CDC advice about who should handle litter during pregnancy or with a weakened immune system.', [cadence('cdcPets')]],
    ['litter-area', 'Clean area around litter box', 'weekly', 8, 'normal', ['cat'], 'standard', 'Sweep tracked litter and clean the surrounding floor with a floor-safe method.'],
    ['leash', 'Check dog leash and harness', 'monthly', 4, 'normal', ['dog'], 'standard', 'Look for worn stitching or broken clips and follow the maker’s cleaning instructions.'],
    ['dog-yard', 'Pick up yard pet waste', 'asNeeded', 5, 'high', ['dog', 'yard'], 'standard', 'Collect pet waste according to local disposal rules and wash hands after handling it.'],
    ['pet-mat', 'Wash pet feeding mat', 'weekly', 4, 'normal', ['pet'], 'standard', 'Clean the mat according to its care label and let it dry before replacing bowls.'],
    ['pet-stock', 'Check pet supply stock', 'weekly', 4, 'normal', ['pet'], 'standard', 'Check food and cleanup supplies and add needed replacements to the shopping list.'],
  ]),
  ...group('Baby care', [
    ['baby-bottles', 'Wash infant feeding items', 'afterUse', 7, 'critical', ['baby', 'bottles'], 'core', 'Take feeding items apart and wash after each feeding. Follow CDC cleaning and air-drying guidance and the product manual.', [cadence('cdcBaby')]],
    ['baby-sanitize', 'Review infant feeding sanitizing guidance', 'asNeeded', 5, 'critical', ['baby', 'bottles'], 'standard', 'Use CDC guidance to decide whether daily sanitizing is recommended for your infant, including under 2 months, premature birth, or weakened immunity. Follow compatible methods in the instructions.', [scope('cdcBaby', 'Daily sanitizing is conditional. This template is a manual review reminder.')]],
    ['baby-brush', 'Clean bottle brush and wash basin', 'afterUse', 4, 'critical', ['baby', 'bottles'], 'standard', 'Rinse the brush and basin and allow them to air-dry. Read CDC guidance for how often to wash them based on your infant’s needs.', [method('cdcBaby', 'After-use rinsing and conditional washing guidance.')]],
    ['pump-parts', 'Clean breast pump parts', 'afterUse', 7, 'critical', ['baby', 'pump'], 'core', 'Clean parts that contact breast milk after use following CDC guidance and your pump instructions.', [cadence('cdcPump')]],
    ['baby-highchair', 'Clean high-chair tray', 'afterUse', 4, 'high', ['baby'], 'standard', 'Remove food and clean the tray with a manufacturer-approved method after meals.', [scope('food', 'General guidance for food-contact surfaces. Follow your high-chair manual.')]],
    ['baby-changing', 'Clean changing surface', 'asNeeded', 4, 'critical', ['baby', 'diaper'], 'core', 'Address soiling promptly using the pad manufacturer’s guidance and keep supplies out of reach.'],
    ['baby-stock', 'Restock diaper station', 'weekly', 4, 'normal', ['baby', 'diaper'], 'standard', 'Count diapers and wipes and add low supplies to the shopping list.'],
    ['baby-laundry', 'Wash baby clothes and bibs', 'asNeeded', 8, 'normal', ['baby'], 'standard', 'Put soiled items in the wash and use settings recommended by their care labels.'],
    ['baby-stroller', 'Wipe stroller handles and seat', 'monthly', 8, 'low', ['baby'], 'deep', 'Check the stroller manual and use the approved cleaning method for the handle and fabric.'],
    ['baby-toys', 'Clean washable baby toys', 'weekly', 8, 'normal', ['baby'], 'standard', 'Follow toy-care labels. Remove damaged toys and wash mouthed toys promptly.'],
    ['baby-playmat', 'Wipe play mat', 'weekly', 6, 'normal', ['baby'], 'standard', 'Remove crumbs and wipe the mat using its care instructions. Dry fully.'],
  ]),
  ...group('Appliances', [
    ['dishwasher-filter', 'Clean dishwasher filter', 'monthly', 8, 'normal', ['dishwasher'], 'standard', 'Check the model’s filter type and removal instructions. Rinse a removable filter and reinstall it securely.', [method('whirlpoolDish', 'Whirlpool gives model and usage considerations. The monthly reminder is a configurable default.')], ['Clean the dishwasher filter']],
    ['dishwasher-arms', 'Inspect dishwasher spray arms', 'quarterly', 8, 'low', ['dishwasher'], 'deep', 'Check spray openings and follow the owner’s manual for clearing debris.', [method('whirlpoolCare')]],
    ['washer-cycle', 'Run washing machine cleaning cycle', 'monthly', 7, 'normal', ['washer'], 'standard', 'Run the maintenance cycle with the washer empty. Use only the cleaning product and cycle specified for your appliance.', [cadence('whirlpoolCare', 'Whirlpool suggests monthly or roughly every 30 cycles; model instructions take precedence.')]],
    ['washer-gasket', 'Wipe washing machine gasket', 'monthly', 6, 'normal', ['washer'], 'standard', 'Inspect an accessible door gasket for lint or residue, then wipe it as instructed in the manual.', [method('whirlpoolCare')]],
    ['dryer-lint', 'Clear dryer lint filter', 'afterUse', 2, 'critical', ['dryer'], 'core', 'Remove lint at every load and reinstall the filter before starting another load. Follow your model’s instructions.', [cadence('samsung')]],
    ['dryer-vent', 'Review dryer vent condition', 'semiannual', 8, 'high', ['dryer'], 'deep', 'Look for accessible lint buildup or poor airflow. Consult your manual and arrange service if you cannot safely inspect or clean it.', [method('samsung')]],
    ['coffee-clean', 'Clean coffee machine', 'monthly', 8, 'normal', ['coffee'], 'standard', 'Clean removable parts and the reservoir using the manufacturer’s instructions for your machine.', [method('nsf', 'NSF defers to the model’s cleaning instructions.')], ['Clean the coffee machine', 'Clean coffee maker', 'Clean coffee reservoir']],
    ['keurig-descale', 'Descale Keurig K-Elite', 'quarterly', 12, 'normal', ['keurig'], 'standard', 'Follow the K-Elite descaling and rinse instructions. The estimate is hands-on time.', [cadence('keurig', 'Keurig suggests every 3–6 months for the K-Elite.')]],
    ['microwave', 'Wipe microwave interior', 'weekly', 7, 'normal', ['microwave'], 'standard', 'When cool, wipe splatters and clean the removable plate following the manual.', [method('aci')]],
    ['oven', 'Clean oven interior', 'quarterly', 15, 'normal', ['oven'], 'deep', 'Once the oven is cool, consult the manual for approved cleaners and the right cleaning method.', [method('whirlpoolCare')]],
    ['robot-bin', 'Empty robot vacuum bin', 'asNeeded', 4, 'normal', ['robot'], 'standard', 'Empty the bin when full or prompted and inspect the filter according to the manual.'],
  ]),
  ...group('Vehicles', [
    ['tire-pressure', 'Check cold tire pressure', 'monthly', 8, 'critical', ['vehicle'], 'core', 'With tires cold, compare pressure to the door placard or owner’s manual. Include the spare when applicable.', [cadence('nhtsa')]],
    ['tire-tread', 'Inspect tire tread and damage', 'monthly', 6, 'high', ['vehicle'], 'standard', 'Look for uneven wear and visible damage. Arrange qualified service if you find a concern.', [cadence('nhtsa')]],
    ['vehicle-lights', 'Check vehicle lights', 'monthly', 5, 'high', ['vehicle'], 'standard', 'Check exterior lights while safely parked. Ask someone to help verify rear lights if needed.'],
    ['wipers', 'Inspect wiper blades', 'quarterly', 4, 'normal', ['vehicle'], 'standard', 'Look for cracks or streaking and replace blades using the vehicle’s recommended fit.'],
    ['washer-fluid', 'Check washer fluid', 'monthly', 4, 'normal', ['vehicle'], 'standard', 'Check the washer-fluid level with the vehicle safely parked and follow the owner’s manual.'],
    ['vehicle-mats', 'Clean vehicle floor mats', 'monthly', 8, 'low', ['vehicle'], 'deep', 'Remove and clean mats. Reinstall mats securely and confirm they clear the pedals.'],
    ['vehicle-trash', 'Clear vehicle clutter', 'weekly', 5, 'low', ['vehicle'], 'standard', 'Remove rubbish and secure loose items before driving.'],
    ['vehicle-glass', 'Clean vehicle glass', 'monthly', 8, 'normal', ['vehicle'], 'standard', 'Clean accessible interior glass with products suitable for any tint and leave no streaks in the driver’s view.'],
    ['vehicle-service', 'Review vehicle service schedule', 'quarterly', 7, 'high', ['vehicle'], 'standard', 'Compare date and mileage to the manufacturer’s schedule and book any service that is due.'],
    ['vehicle-kit', 'Check roadside supplies', 'semiannual', 8, 'normal', ['vehicle'], 'deep', 'Check the condition and accessibility of your roadside supplies before seasonal travel.'],
    ['vehicle-trip', 'Review car before a long trip', 'asNeeded', 10, 'high', ['vehicle'], 'standard', 'Use the owner’s manual to review tires, lights, and upcoming service. Resolve concerns before departure.', [scope('nhtsa', 'Reference for tire checks.')]],
  ]),
  ...group('Seasonal maintenance', [
    ['smoke-test', 'Test smoke alarms', 'monthly', 5, 'critical', [], 'core', 'Use the test button and follow the instructions for each alarm. Use a shorter interval if your model or local guidance requires it.', [cadence('kidde', 'Kidde recommends at least monthly in this guide; individual model instructions can differ.')]],
    ['air-check', 'Inspect HVAC filter', 'monthly', 5, 'normal', ['hvac'], 'standard', 'Inspect the accessible filter and check the system instructions for approved cleaning or replacement.', [cadence('energy')]],
    ['air-replace', 'Replace HVAC filter', 'quarterly', 8, 'normal', ['hvac'], 'standard', 'Confirm the size and compatibility. Follow the equipment manual for access, airflow direction, and replacement.', [cadence('energy', 'ENERGY STAR suggests at least every three months, or sooner if needed.')]],
    ['gutters', 'Plan gutter check', 'semiannual', 8, 'normal', ['exterior'], 'deep', 'Inspect drainage from ground level where possible and arrange safe access or qualified service.', [scope('aci', 'ACI includes gutter cleaning in its home routine. Timing depends on trees and weather.')]],
    ['downspouts', 'Inspect downspout outlets', 'quarterly', 6, 'normal', ['exterior'], 'deep', 'Look for visible blockages, loosened extensions, or water collecting at the outlet.'],
    ['fireplace', 'Review chimney service', 'annual', 7, 'high', ['fireplace'], 'standard', 'Check when the system was last inspected and arrange qualified service before the heating season if due.', [scope('aci', 'ACI includes annual chimney and fireplace care. Check guidance for your installation.')]],
    ['yard-tools', 'Inspect yard tools', 'semiannual', 10, 'low', ['yard'], 'deep', 'Check blades, cords, and handles while equipment is off. Follow manuals for maintenance.'],
    ['outdoor-hose', 'Prepare outdoor hose for weather', 'asNeeded', 8, 'normal', ['yard'], 'deep', 'Follow local weather and your plumbing instructions for safely disconnecting and storing hoses.'],
    ['exterior-doors', 'Check exterior door seals', 'semiannual', 8, 'low', ['exterior'], 'deep', 'Look for gaps or worn seals and check what can be replaced without affecting door operation.'],
    ['window-tracks', 'Clean accessible window tracks', 'semiannual', 12, 'low', [], 'deep', 'Remove loose debris from reachable tracks and use the cleaning method approved for your windows.', [method('aci')]],
    ['emergency-supplies', 'Review emergency supplies', 'semiannual', 12, 'high', [], 'standard', 'Check expiration dates and replace used items. Review current local guidance for what to keep.'],
    ['seasonal-storage', 'Rotate seasonal storage', 'semiannual', 15, 'low', [], 'deep', 'Label and check a group of seasonal items and move what you need next into reach.'],
  ]),
] satisfies ChoreTemplate[]

export function templateById(id?: string) {
  return choreLibrary.find(item => item.id === id)
}
