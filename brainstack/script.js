(() => {
"use strict";

/* ------------------------------------------------------------------ content */
const LEVELS = 5, PER_ROUND = 6, PASS = 4;
const LEVEL_NAMES = ["Warm-up", "Rookie", "Skilled", "Expert", "Master"];

const MODES = [
  { id: "olympiad",  name: "Olympiad Math",  glyph: "∑",   color: "--m1", kind: "mc", fresh: true,
    blurb: "Puzzle-style maths: patterns, counting, logic. Level 5 has no timer." },
  { id: "science",   name: "Science",        glyph: "Sci", color: "--m6", kind: "mc", fresh: true,
    blurb: "Easy science to start. Level 5 is trick questions that are simpler than they look." },
  { id: "trivia",    name: "General Trivia", glyph: "?",   color: "--m7", kind: "mc",
    blurb: "History, art, geography and the world around you." },
  { id: "capitals",  name: "Capital Cities", glyph: "◎",   color: "--m2", kind: "mc",
    blurb: "Name the capital. Gets trickier as the map widens." },
  { id: "math",      name: "Math Sprint",    glyph: "÷",   color: "--m3", kind: "mc",
    blurb: "Quick mental arithmetic, freshly generated every round." },
  { id: "truefalse", name: "True or False",  glyph: "T/F", color: "--m4", kind: "tf",
    blurb: "Facts and famous myths. Spot which is which." },
  { id: "scramble",  name: "Word Scramble",  glyph: "Aa",  color: "--m5", kind: "type",
    blurb: "Unscramble the letters and type the word." },
];

// Brainstack Level 3 has its own four sections.
const MODES3 = [
  { id: "olympiad", name: "Olympiad Math",    glyph: "∑",   color: "--m1", kind: "mc",
    blurb: "Contest maths: remainders, divisors, counting and clever algebra. Level 5 has no timer." },
  { id: "calculus", name: "Calculus",         glyph: "∫",   color: "--m4", kind: "mc", fresh3: true,
    blurb: "Limits, derivatives and integrals, from the power rule to integration by parts." },
  { id: "science",  name: "Science",          glyph: "Sci", color: "--m6", kind: "mc",
    blurb: "Physics, chemistry and biology with real numbers. Level 5 tests ideas people often get wrong." },
  { id: "remix",    name: "Brainstack Remix", glyph: "↺",   color: "--m3", kind: "mc", fresh3: true,
    blurb: "Questions from all seven games of Levels 1 and 2, mixed together on a faster clock." },
];
const modesFor = stage => stage === 3 ? MODES3 : MODES;

// Brainstack Level 2 opens once a player has cleared every Level 1 game level and played this many games.
// Brainstack Level 3 opens once every Level 2 game level is cleared.
const STAGE2_GAMES = 35;
const STAGE_MULT = { 1: 1, 2: 1.5, 3: 3 };
const STAGE_NAME = { 1: "Brainstack Level 1", 2: "Brainstack Level 2", 3: "Brainstack Level 3" };

// Seconds per question for each level. 0 means no timer.
const DEFAULT_TIMES = [20, 18, 16, 14, 12];
const TIMES = {
  1: { olympiad: [45, 40, 35, 30, 0], science: [20, 20, 18, 18, 25], scramble: [30, 28, 26, 24, 22] },
  2: { olympiad: [50, 45, 40, 35, 0], science: [20, 20, 18, 18, 30], scramble: [35, 35, 35, 40, 45], math: [25, 22, 20, 20, 18] },
  3: { olympiad: [60, 55, 50, 45, 0], calculus: [45, 45, 40, 40, 0], science: [25, 22, 20, 20, 30], remix: [16, 15, 14, 13, 12] },
};
const timeFor = (mode, level, stage = 1) => (TIMES[stage][mode] || DEFAULT_TIMES)[level - 1];

// Each level has its own, non-overlapping set of questions.
// Multiple choice rows: [question, correct, wrong, wrong, wrong, optional note]
const OLYMPIAD = [
  [ ["What comes next: 2, 4, 8, 16, …?", "32", "24", "30", "64", "Each number doubles."],
    ["Tom is 7th from the front and 7th from the back of a line. How many people are in the line?", "13", "14", "12", "15", "6 ahead + Tom + 6 behind."],
    ["A farm has 5 hens and 3 cows. How many legs are there in total?", "22", "16", "20", "24", "5 × 2 + 3 × 4 = 22."],
    ["What is 1 + 2 + 3 + … + 10?", "55", "50", "45", "65", "Pair 1+10, 2+9, … : five pairs of 11."],
    ["Today is Monday. What day is it 10 days from now?", "Thursday", "Wednesday", "Friday", "Sunday", "10 days = 1 week + 3 days."],
    ["A clock shows exactly 3:00. What is the angle between the hands?", "90°", "60°", "120°", "45°", "3 of 12 hours is a quarter turn."] ],
  [ ["How many two-digit numbers are there?", "90", "99", "89", "100", "From 10 to 99 inclusive."],
    ["Three consecutive numbers add up to 48. What is the largest?", "17", "16", "18", "15", "15 + 16 + 17 = 48."],
    ["5 people each shake hands once with everyone else. How many handshakes?", "10", "20", "25", "15", "5 × 4 ÷ 2 = 10."],
    ["What is the last digit of 2¹⁰?", "4", "2", "6", "8", "2¹⁰ = 1024."],
    ["A rectangle has perimeter 20 cm and length 6 cm. What is its area?", "24 cm²", "20 cm²", "36 cm²", "30 cm²", "Width is 4 cm, so 6 × 4."],
    ["Half of a number is 3 more than a third of it. What is the number?", "18", "12", "24", "36", "n/2 − n/3 = n/6 = 3."] ],
  [ ["How many times is the digit 1 written when you write the numbers 1 to 20?", "12", "11", "10", "13", "1, 10, 11 (twice), 12–19."],
    ["What is the smallest number divisible by 2, 3, 4, 5 and 6?", "60", "120", "30", "360", "LCM = 4 × 3 × 5."],
    ["A snail climbs 3 m up a 10 m wall each day and slips 2 m each night. On which day does it reach the top?", "Day 8", "Day 10", "Day 7", "Day 9", "After 7 nights it's at 7 m, then climbs 3 m on day 8."],
    ["How many diagonals does a hexagon have?", "9", "6", "12", "8", "6 × 3 ÷ 2 = 9."],
    ["What is the remainder when 100 is divided by 7?", "2", "1", "3", "5", "7 × 14 = 98."],
    ["3 cats catch 3 mice in 3 minutes. How many cats catch 100 mice in 100 minutes?", "3", "100", "33", "300", "Each cat catches one mouse every 3 minutes."] ],
  [ ["How many zeros are at the end of 10! (10 factorial)?", "2", "1", "3", "10", "10! = 3,628,800."],
    ["What is the sum of the interior angles of a pentagon?", "540°", "360°", "720°", "450°", "(5 − 2) × 180°."],
    ["How many positive divisors does 36 have?", "9", "8", "6", "10", "1, 2, 3, 4, 6, 9, 12, 18, 36."],
    ["What is the last digit of 3²⁰²⁵?", "3", "9", "7", "1", "Last digits repeat 3, 9, 7, 1 and 2025 leaves remainder 1 on division by 4."],
    ["Ann is twice as old as Ben. In 5 years their ages will add up to 40. How old is Ben now?", "10", "15", "20", "8", "3 × Ben + 10 = 40."],
    ["A painted 3×3×3 cube is cut into 27 small cubes. How many have exactly two painted faces?", "12", "8", "6", "24", "One on the middle of each of the 12 edges."] ],
  [ ["What is 1 − 2 + 3 − 4 + … + 99 − 100?", "−50", "50", "0", "−100", "50 pairs, each equal to −1."],
    ["How many squares of any size are on an 8×8 chessboard?", "204", "64", "128", "196", "1² + 2² + … + 8² = 204."],
    ["What is the sum of the digits of 10²⁵ − 25?", "219", "225", "216", "207", "It is 23 nines followed by 75."],
    ["In how many ways can you climb 6 stairs taking 1 or 2 steps at a time?", "13", "12", "8", "21", "The counts go 1, 2, 3, 5, 8, 13."],
    ["What is the smallest number above 1 that leaves remainder 1 when divided by 2, 3, 4, 5 and 6?", "61", "31", "121", "59", "60 + 1."],
    ["Two numbers multiply to 144 and their greatest common divisor is 4. What is their least common multiple?", "36", "48", "72", "12", "GCD × LCM = product, so 144 ÷ 4."] ],
];

const SCIENCE = [
  [ ["What do bees make?", "Honey", "Milk", "Silk", "Butter"],
    ["Which part of a plant takes in water from the soil?", "Roots", "Leaves", "Flowers", "Petals"],
    ["What is frozen water called?", "Ice", "Steam", "Fog", "Dew"],
    ["Which body part do we use to smell?", "Nose", "Ears", "Eyes", "Tongue"],
    ["What does a caterpillar grow up to become?", "A butterfly", "A bee", "A beetle", "A bird"],
    ["Which star is closest to Earth?", "The Sun", "Polaris", "Sirius", "The Moon"] ],
  [ ["What force pulls things down towards the Earth?", "Gravity", "Magnetism", "Friction", "Wind"],
    ["Which organ pumps blood around the body?", "Heart", "Lungs", "Liver", "Kidneys"],
    ["Which gas do plants give off that we need to breathe?", "Oxygen", "Carbon dioxide", "Helium", "Hydrogen"],
    ["How many planets are in our solar system?", "8", "9", "7", "10"],
    ["At what temperature does water boil at sea level?", "100 °C", "90 °C", "50 °C", "120 °C"],
    ["Which of these is attracted to a magnet?", "Iron", "Wood", "Plastic", "Glass"] ],
  [ ["What are the three everyday states of matter?", "Solid, liquid, gas", "Hot, warm, cold", "Rock, water, air", "Big, medium, small"],
    ["What do we call animals that eat only plants?", "Herbivores", "Carnivores", "Omnivores", "Insectivores"],
    ["Which planet is famous for its bright rings?", "Saturn", "Mars", "Mercury", "Venus"],
    ["What does a thermometer measure?", "Temperature", "Weight", "Speed", "Height"],
    ["Which vitamin does your skin make in sunlight?", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin B12"],
    ["What is the centre of an atom called?", "The nucleus", "The electron", "The molecule", "The cell"] ],
  [ ["What is H₂O?", "Water", "Salt", "Oxygen gas", "Hydrogen peroxide"],
    ["Which part of the eye controls how much light gets in?", "Iris", "Retina", "Lens", "Eyelash"],
    ["What kind of energy does a moving car have?", "Kinetic energy", "Nuclear energy", "Sound energy", "Elastic energy"],
    ["How do plants make food from sunlight?", "Photosynthesis", "Respiration", "Digestion", "Evaporation"],
    ["What is the chemical symbol for sodium?", "Na", "So", "Sd", "S"],
    ["Which layer of the atmosphere holds the ozone layer?", "Stratosphere", "Troposphere", "Mesosphere", "Exosphere"] ],
  [ ["Which weighs more: a kilogram of feathers or a kilogram of iron?", "They weigh the same", "The iron", "The feathers", "It depends on the wind", "A kilogram is a kilogram."],
    ["How many months of the year have 28 days?", "All 12", "1", "2", "6", "Every month has at least 28 days."],
    ["A rooster lays an egg on the very top of a pointed roof. Which way does it roll?", "Roosters don't lay eggs", "Left", "Right", "Straight down", "Only hens lay eggs."],
    ["An electric train travels north while the wind blows west. Which way does its smoke blow?", "There is no smoke", "West", "North", "East", "Electric trains don't make smoke."],
    ["On the Moon, with no air, you drop a hammer and a feather together. Which lands first?", "They land together", "The hammer", "The feather", "Neither falls", "Apollo 15 astronaut David Scott tried it on live TV."],
    ["Ice cubes float in a full glass of water. When they melt, what happens to the water level?", "It stays the same", "It overflows", "It goes down", "It doubles", "Floating ice already pushes aside its own weight in water."] ],
];

const TRIVIA = [
  [ ["How many continents are there on Earth?", "7", "5", "6", "8"],
    ["Which planet is known as the Red Planet?", "Mars", "Venus", "Jupiter", "Mercury"],
    ["What is the largest ocean on Earth?", "Pacific", "Atlantic", "Indian", "Arctic"],
    ["How many legs does a spider have?", "8", "6", "10", "12"],
    ["Which instrument has 88 keys?", "Piano", "Guitar", "Violin", "Flute"],
    ["Which big cat is often called the King of the Jungle?", "Lion", "Tiger", "Leopard", "Jaguar"] ],
  [ ["Who painted the Mona Lisa?", "Leonardo da Vinci", "Michelangelo", "Raphael", "Vincent van Gogh"],
    ["What is the hardest natural substance?", "Diamond", "Quartz", "Granite", "Iron"],
    ["What is the chemical symbol for gold?", "Au", "Ag", "Gd", "Go"],
    ["How many bones are in the adult human body?", "206", "186", "212", "256"],
    ["In which year did humans first land on the Moon?", "1969", "1965", "1972", "1959"],
    ["Which is the largest planet in our solar system?", "Jupiter", "Saturn", "Neptune", "Earth"] ],
  [ ["What is the smallest prime number?", "2", "1", "3", "0"],
    ["Which language has the most native speakers?", "Mandarin Chinese", "English", "Spanish", "Hindi"],
    ["Which part of the cell is called its powerhouse?", "Mitochondria", "Nucleus", "Ribosome", "Golgi apparatus"],
    ["Who wrote “Pride and Prejudice”?", "Jane Austen", "Charlotte Brontë", "Mary Shelley", "George Eliot"],
    ["Roughly how fast does light travel in a vacuum?", "300,000 km/s", "30,000 km/s", "150,000 km/s", "3,000,000 km/s"],
    ["Which element has atomic number 1?", "Hydrogen", "Helium", "Oxygen", "Lithium"] ],
  [ ["Who formulated the three laws of motion?", "Isaac Newton", "Galileo Galilei", "Albert Einstein", "Johannes Kepler"],
    ["What is the largest organ of the human body?", "Skin", "Liver", "Brain", "Lungs"],
    ["Which blood type is known as the universal donor?", "O negative", "AB positive", "A negative", "B positive"],
    ["Who composed the “Moonlight Sonata”?", "Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Frédéric Chopin"],
    ["What does DNA stand for?", "Deoxyribonucleic acid", "Dinitrogen acid", "Deoxyribose nitrate", "Dual nucleic acid"],
    ["Which country spans the most time zones, counting overseas territories?", "France", "Russia", "United States", "China"] ],
  [ ["Which metal is liquid at standard room temperature?", "Mercury", "Gallium", "Cesium", "Lead"],
    ["In which year did the Berlin Wall fall?", "1989", "1991", "1987", "1985"],
    ["What is the SI unit of electrical resistance?", "Ohm", "Volt", "Ampere", "Watt"],
    ["Which ancient wonder stood at Alexandria?", "The Lighthouse (Pharos)", "The Hanging Gardens", "The Colossus", "The Temple of Artemis"],
    ["Which planet has the most confirmed moons?", "Saturn", "Jupiter", "Uranus", "Neptune"],
    ["Who developed the general theory of relativity?", "Albert Einstein", "Niels Bohr", "Max Planck", "Stephen Hawking"] ],
];

const CAPITALS = [
  [ ["France", "Paris", "Lyon", "Marseille", "Nice"],
    ["Japan", "Tokyo", "Osaka", "Kyoto", "Yokohama"],
    ["Italy", "Rome", "Milan", "Venice", "Naples"],
    ["Egypt", "Cairo", "Alexandria", "Luxor", "Giza"],
    ["the United Kingdom", "London", "Manchester", "Edinburgh", "Birmingham"],
    ["Russia", "Moscow", "Saint Petersburg", "Kazan", "Novosibirsk"] ],
  [ ["Spain", "Madrid", "Barcelona", "Seville", "Valencia"],
    ["Germany", "Berlin", "Munich", "Hamburg", "Frankfurt"],
    ["India", "New Delhi", "Mumbai", "Kolkata", "Bengaluru"],
    ["China", "Beijing", "Shanghai", "Hong Kong", "Guangzhou"],
    ["Greece", "Athens", "Thessaloniki", "Sparta", "Patras"],
    ["Mexico", "Mexico City", "Guadalajara", "Cancún", "Monterrey"] ],
  [ ["Australia", "Canberra", "Sydney", "Melbourne", "Perth"],
    ["Canada", "Ottawa", "Toronto", "Vancouver", "Montreal"],
    ["Brazil", "Brasília", "Rio de Janeiro", "São Paulo", "Salvador"],
    ["Turkey", "Ankara", "Istanbul", "Izmir", "Antalya"],
    ["Switzerland", "Bern", "Zurich", "Geneva", "Basel"],
    ["New Zealand", "Wellington", "Auckland", "Christchurch", "Hamilton"] ],
  [ ["Nigeria", "Abuja", "Lagos", "Kano", "Ibadan"],
    ["Pakistan", "Islamabad", "Karachi", "Lahore", "Peshawar"],
    ["Vietnam", "Hanoi", "Ho Chi Minh City", "Da Nang", "Huế"],
    ["Morocco", "Rabat", "Casablanca", "Marrakesh", "Fez"],
    ["Kenya", "Nairobi", "Mombasa", "Kisumu", "Nakuru"],
    ["Peru", "Lima", "Cusco", "Arequipa", "Trujillo"] ],
  [ ["Kazakhstan", "Astana", "Almaty", "Shymkent", "Karaganda"],
    ["Myanmar", "Naypyidaw", "Yangon", "Mandalay", "Bago"],
    ["Mongolia", "Ulaanbaatar", "Erdenet", "Darkhan", "Khovd"],
    ["Bhutan", "Thimphu", "Paro", "Punakha", "Phuntsholing"],
    ["Iceland", "Reykjavík", "Akureyri", "Kópavogur", "Húsavík"],
    ["Tanzania", "Dodoma", "Dar es Salaam", "Arusha", "Zanzibar City"] ],
];

const TRUEFALSE = [
  [ ["The Sun is a star.", true, "It is a G-type main-sequence star."],
    ["Bats are blind.", false, "All bats can see; many also use echolocation."],
    ["Water boils at 100 °C at sea level.", true, "At standard atmospheric pressure."],
    ["Penguins can fly.", false, "Their wings are flippers built for swimming."],
    ["A hexagon has six sides.", true, "Hex comes from the Greek for six."],
    ["The Great Wall of China is visible from the Moon with the naked eye.", false, "It is far too narrow to see from that distance."] ],
  [ ["Lightning never strikes the same place twice.", false, "Tall buildings are struck many times a year."],
    ["Sound travels faster in water than in air.", true, "About four times faster."],
    ["An octopus has three hearts.", true, "Two pump blood to the gills, one to the body."],
    ["Goldfish only have a three-second memory.", false, "They can remember things for months."],
    ["Venus is the hottest planet in the solar system.", true, "Its thick CO₂ atmosphere traps heat."],
    ["Humans only use 10% of their brains.", false, "Brain scans show activity across nearly all regions."] ],
  [ ["Botanically, bananas are berries but strawberries are not.", true, "Strawberries are aggregate accessory fruits."],
    ["Mount Everest is the tallest mountain measured from base to peak.", false, "Mauna Kea is taller from its base on the sea floor."],
    ["Glass is a slow-flowing liquid at room temperature.", false, "It is an amorphous solid; old windows were simply made uneven."],
    ["Honey found in ancient Egyptian tombs was still edible.", true, "Its low moisture and acidity stop bacteria growing."],
    ["Sharks are mammals.", false, "Sharks are fish; dolphins and whales are the mammals."],
    ["A day on Venus is longer than a year on Venus.", true, "It rotates once every 243 Earth days but orbits in 225."] ],
  [ ["Napoleon was unusually short for his time.", false, "He was about 1.69 m, average for a Frenchman then."],
    ["Oxford University is older than the Aztec Empire.", true, "Teaching at Oxford began by 1096; Tenochtitlan was founded in 1325."],
    ["Diamonds are made of carbon.", true, "Carbon atoms in a tightly bonded crystal lattice."],
    ["Chameleons change colour mainly to camouflage.", false, "They mostly change colour to signal mood and regulate temperature."],
    ["Sunlight takes about 8 minutes to reach Earth.", true, "Roughly 8 minutes 20 seconds."],
    ["Viking warriors wore horned helmets in battle.", false, "That image comes from 19th-century opera costumes."] ],
  [ ["There are more possible chess games than atoms in the observable universe.", true, "The Shannon number is around 10¹²⁰; atoms are around 10⁸⁰."],
    ["Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.", true, "The pyramid was about 2,500 years before her; Apollo 11 about 2,000 after."],
    ["The Eiffel Tower is taller in summer than in winter.", true, "Thermal expansion adds up to about 15 cm."],
    ["Hot water always freezes faster than cold water.", false, "The Mpemba effect is rare and disputed, not a rule."],
    ["Wombats produce cube-shaped droppings.", true, "Their intestines have varying elasticity that shapes them."],
    ["Antarctica is the largest desert on Earth.", true, "A desert is defined by low precipitation, not heat."] ],
];

const SCRAMBLE = [
  [ ["APPLE", "A fruit that keeps the doctor away"], ["HOUSE", "A place to live"], ["TIGER", "A striped big cat"],
    ["WATER", "You drink it every day"], ["CHAIR", "You sit on it"], ["GREEN", "The colour of grass"] ],
  [ ["PLANET", "It orbits a star"], ["GUITAR", "A six-string instrument"], ["CASTLE", "A royal fortress"],
    ["BRIDGE", "It crosses a river"], ["PENCIL", "A writing tool with an eraser"], ["ORANGE", "A fruit and a colour"] ],
  [ ["JOURNEY", "A long trip"], ["VOLCANO", "A mountain that erupts"], ["DIAMOND", "The hardest gemstone"],
    ["LIBRARY", "A building full of books"], ["BLANKET", "Keeps you warm in bed"], ["DOLPHIN", "A clever marine mammal"] ],
  [ ["ELEPHANT", "The largest land animal"], ["TREASURE", "Pirates bury it"], ["MOUNTAIN", "Everest is one"],
    ["HOSPITAL", "Where doctors and nurses work"], ["KEYBOARD", "You type on it"], ["UMBRELLA", "Keeps the rain off"] ],
  [ ["ADVENTURE", "An exciting experience"], ["CHOCOLATE", "Made from cocoa beans"], ["TELESCOPE", "Used to look at stars"],
    ["BUTTERFLY", "It starts life as a caterpillar"], ["CROCODILE", "A large reptile with powerful jaws"], ["NEWSPAPER", "Daily printed news"] ],
];

/* ---------------------------------------------- Brainstack Level 2 content */
const OLYMPIAD2 = [
  [ ["What comes next: 1, 4, 9, 16, 25, …?", "36", "30", "35", "49", "These are the square numbers."],
    ["What comes next: 1, 1, 2, 3, 5, 8, …?", "13", "11", "12", "16", "Each number is the sum of the two before it."],
    ["How many minutes are there in 2½ hours?", "150", "120", "130", "250", "2 × 60 + 30."],
    ["A book's pages are numbered 1 to 50. How many page numbers are odd?", "25", "24", "26", "50", "Every other number is odd."],
    ["4 pencils cost ₹20. How much do 7 pencils cost?", "₹35", "₹28", "₹30", "₹40", "Each pencil costs ₹5."],
    ["Sara has twice as many marbles as Leo. Together they have 24. How many does Sara have?", "16", "12", "8", "18", "Leo has 8, Sara has 16."] ],
  [ ["What is the smallest 3-digit number divisible by 7?", "105", "100", "107", "112", "7 × 15 = 105."],
    ["How many numbers from 1 to 100 are divisible by both 3 and 5?", "6", "5", "7", "33", "Multiples of 15: 15, 30, … 90."],
    ["A train leaves at 9:45 and the journey takes 2 h 35 min. When does it arrive?", "12:20", "12:10", "12:30", "11:20", "9:45 + 2 h = 11:45, + 35 min = 12:20."],
    ["What is the average of 12, 15, 18 and 23?", "17", "16", "18", "15.5", "68 ÷ 4."],
    ["How many edges does a cube have?", "12", "8", "6", "24", "4 on top, 4 on the bottom, 4 upright."],
    ["How many digits do you write when writing all the numbers from 1 to 30?", "51", "50", "60", "49", "9 one-digit + 21 two-digit numbers."] ],
  [ ["What is the last digit of 7⁴?", "1", "7", "9", "3", "7⁴ = 2401."],
    ["Three consecutive numbers multiply to 120. What is their sum?", "15", "12", "18", "14", "4 × 5 × 6 = 120."],
    ["How many prime numbers are there between 1 and 30?", "10", "9", "11", "8", "2, 3, 5, 7, 11, 13, 17, 19, 23, 29."],
    ["A square has the same perimeter as a 10 cm × 6 cm rectangle. What is the square's area?", "64 cm²", "60 cm²", "32 cm²", "81 cm²", "Perimeter 32 cm, so each side is 8 cm."],
    ["In a class, 18 like tea, 15 like coffee and 6 like both. Everyone likes at least one. How many students are there?", "27", "33", "39", "21", "18 + 15 − 6."],
    ["How many rectangles (squares included) can you find in a 2 × 2 grid?", "9", "4", "5", "8", "4 small, 4 made of two squares, 1 big."] ],
  [ ["What is the sum of the first 20 odd numbers?", "400", "200", "210", "441", "The first n odd numbers add up to n²."],
    ["How many 3-digit numbers have all three digits the same?", "9", "10", "27", "3", "111, 222, … 999."],
    ["A car drives 60 km at 30 km/h, then returns at 60 km/h. What is its average speed?", "40 km/h", "45 km/h", "50 km/h", "35 km/h", "120 km in 3 hours."],
    ["What is the remainder when 2¹⁰⁰ is divided by 3?", "1", "2", "0", "3", "Even powers of 2 always leave remainder 1."],
    ["In how many different orders can 4 people stand in a line?", "24", "16", "12", "4", "4 × 3 × 2 × 1."],
    ["A triangle's angles are in the ratio 1 : 2 : 3. What is the largest angle?", "90°", "60°", "120°", "100°", "180° split into 6 parts of 30°."] ],
  [ ["How many zeros are at the end of 100!?", "24", "20", "25", "11", "100 ÷ 5 + 100 ÷ 25 = 20 + 4."],
    ["What is the remainder when 1 + 2 + 3 + … + 100 is divided by 7?", "3", "0", "1", "5", "The sum is 5050 = 7 × 721 + 3."],
    ["How many numbers from 1 to 1000 are perfect squares or perfect cubes?", "38", "41", "35", "31", "31 squares + 10 cubes − 3 that are both."],
    ["A clock shows 2:30. What is the smaller angle between the hands?", "105°", "90°", "120°", "112.5°", "Hour hand at 75°, minute hand at 180°."],
    ["How many diagonals does a 10-sided polygon have?", "35", "45", "40", "30", "10 × 7 ÷ 2."],
    ["What is the smallest n for which n! ends in exactly 3 zeros?", "15", "10", "20", "25", "5, 10 and 15 each add one zero."] ],
];

const SCIENCE2 = [
  [ ["Which gas makes up most of the air around us?", "Nitrogen", "Oxygen", "Carbon dioxide", "Argon"],
    ["Where in the body is the smallest bone?", "In the ear", "In the nose", "In the toe", "In the finger"],
    ["What do we call an animal that is active at night?", "Nocturnal", "Diurnal", "Herbivore", "Migratory"],
    ["What is a baby frog called?", "Tadpole", "Cub", "Kid", "Calf"],
    ["Which planet is closest to the Sun?", "Mercury", "Venus", "Mars", "Earth"],
    ["At sea level, water boils at what temperature in Fahrenheit?", "212 °F", "100 °F", "180 °F", "32 °F"] ],
  [ ["What is the hardest substance in the human body?", "Tooth enamel", "Thigh bone", "Skull", "Fingernails"],
    ["What do red blood cells carry around the body?", "Oxygen", "Sugar", "Germs", "Water"],
    ["Which simple machine is a seesaw?", "A lever", "A pulley", "A wheel and axle", "A screw"],
    ["What kind of rock forms when lava cools?", "Igneous", "Sedimentary", "Metamorphic", "Limestone"],
    ["About how long does Earth take to go once around the Sun?", "365 days", "30 days", "24 hours", "100 days"],
    ["What is Earth's only natural satellite?", "The Moon", "The Sun", "Mars", "The ISS"] ],
  [ ["What is the chemical symbol for iron?", "Fe", "Ir", "In", "I"],
    ["Which blood vessels carry blood away from the heart?", "Arteries", "Veins", "Capillaries", "Nerves"],
    ["What is the unit of force?", "Newton", "Joule", "Watt", "Pascal"],
    ["Which part of a plant cell uses light to make food?", "Chloroplast", "Nucleus", "Cell wall", "Vacuole"],
    ["What type of animal is a whale?", "Mammal", "Fish", "Reptile", "Amphibian"],
    ["Which colour of light bends the most in a prism?", "Violet", "Red", "Yellow", "Green"] ],
  [ ["What is the pH of pure water?", "7", "0", "14", "1"],
    ["Which planet spins on its side?", "Uranus", "Neptune", "Saturn", "Jupiter"],
    ["What is the most common element in the universe?", "Hydrogen", "Helium", "Oxygen", "Carbon"],
    ["Sound cannot travel through which of these?", "A vacuum", "Water", "Steel", "Air"],
    ["Which organ makes insulin?", "Pancreas", "Liver", "Stomach", "Kidney"],
    ["What kind of energy is stored in a stretched rubber band?", "Elastic potential energy", "Kinetic energy", "Thermal energy", "Light energy"] ],
  [ ["Where on Earth is north in every direction?", "The South Pole", "The North Pole", "The Equator", "Nowhere", "From the South Pole, every way you face is north."],
    ["A doctor gives you 3 pills to take one every half hour. How long until they're all gone?", "1 hour", "1½ hours", "3 hours", "30 minutes", "Take one now, one at 30 minutes, one at 60."],
    ["There are 6 apples in a bowl and you take away 4. How many apples do you have?", "4", "2", "6", "0", "You took 4, so you have 4."],
    ["What gets wetter the more it dries?", "A towel", "The sea", "A cloud", "Sand", "It soaks up water as it dries you."],
    ["How many times can you subtract 10 from 100?", "Once", "10 times", "9 times", "100 times", "After the first time, you're subtracting from 90."],
    ["What has to be broken before you can use it?", "An egg", "A bottle", "A pencil", "A chair", "You crack it open to cook it."] ],
];

const TRIVIA2 = [
  [ ["How many days are there in a leap year?", "366", "365", "364", "360"],
    ["What is the tallest animal in the world?", "Giraffe", "Elephant", "Camel", "Ostrich"],
    ["How many colours are in a rainbow?", "7", "5", "6", "8"],
    ["What is the largest mammal on Earth?", "Blue whale", "Elephant", "Giraffe", "Hippopotamus"],
    ["How many sides does an octagon have?", "8", "6", "7", "10"],
    ["Which Indian festival is known as the festival of lights?", "Diwali", "Holi", "Eid", "Pongal"] ],
  [ ["Who wrote “Romeo and Juliet”?", "William Shakespeare", "Charles Dickens", "Mark Twain", "Jane Austen"],
    ["What is the national animal of India?", "Bengal tiger", "Lion", "Peacock", "Elephant"],
    ["Which is the longest bone in the human body?", "Femur (thigh bone)", "Humerus", "Tibia", "Spine"],
    ["How many players does a football (soccer) team have on the field?", "11", "10", "9", "12"],
    ["Which country gave the Statue of Liberty to the USA?", "France", "Britain", "Spain", "Germany"],
    ["Which planet is often called the Morning Star?", "Venus", "Mars", "Mercury", "Jupiter"] ],
  [ ["Who was the first person to walk on the Moon?", "Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "Michael Collins"],
    ["Which is the largest country by area?", "Russia", "Canada", "China", "United States"],
    ["Who received the first patent for the telephone?", "Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "Guglielmo Marconi"],
    ["In which country were the ancient Olympic Games held?", "Greece", "Italy", "France", "Egypt"],
    ["What is the currency of Japan?", "Yen", "Won", "Yuan", "Ringgit"],
    ["How many strings does a standard violin have?", "4", "5", "6", "3"] ],
  [ ["Who painted “The Starry Night”?", "Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dalí"],
    ["Which is the smallest country in the world?", "Vatican City", "Monaco", "San Marino", "Malta"],
    ["Who is known as the father of the computer?", "Charles Babbage", "Alan Turing", "Bill Gates", "Ada Lovelace"],
    ["What is the longest river in India?", "Ganga", "Godavari", "Yamuna", "Brahmaputra"],
    ["In which ocean is the Bermuda Triangle?", "Atlantic", "Pacific", "Indian", "Arctic"],
    ["Which gas gives fizzy drinks their bubbles?", "Carbon dioxide", "Oxygen", "Nitrogen", "Helium"] ],
  [ ["Which Indian mathematician is famous for the number 1729?", "Srinivasa Ramanujan", "Aryabhata", "C. V. Raman", "Brahmagupta"],
    ["In which year did India become independent?", "1947", "1950", "1942", "1945"],
    ["Which element has the chemical symbol K?", "Potassium", "Krypton", "Calcium", "Carbon"],
    ["Who wrote “The Jungle Book”?", "Rudyard Kipling", "Roald Dahl", "Lewis Carroll", "J. M. Barrie"],
    ["Who discovered penicillin?", "Alexander Fleming", "Louis Pasteur", "Marie Curie", "Edward Jenner"],
    ["Which is the highest waterfall in the world?", "Angel Falls", "Niagara Falls", "Victoria Falls", "Iguazu Falls"] ],
];

const CAPITALS2 = [
  [ ["Portugal", "Lisbon", "Porto", "Faro", "Braga"],
    ["the Netherlands", "Amsterdam", "Rotterdam", "Utrecht", "Eindhoven"],
    ["Ireland", "Dublin", "Cork", "Galway", "Limerick"],
    ["Norway", "Oslo", "Bergen", "Trondheim", "Stavanger"],
    ["Sweden", "Stockholm", "Gothenburg", "Malmö", "Uppsala"],
    ["Thailand", "Bangkok", "Phuket", "Chiang Mai", "Pattaya"] ],
  [ ["Argentina", "Buenos Aires", "Córdoba", "Rosario", "Mendoza"],
    ["South Korea", "Seoul", "Busan", "Incheon", "Daegu"],
    ["Austria", "Vienna", "Salzburg", "Graz", "Innsbruck"],
    ["Poland", "Warsaw", "Kraków", "Gdańsk", "Wrocław"],
    ["Saudi Arabia", "Riyadh", "Jeddah", "Mecca", "Dammam"],
    ["Nepal", "Kathmandu", "Pokhara", "Lalitpur", "Biratnagar"] ],
  [ ["Chile", "Santiago", "Valparaíso", "Concepción", "Antofagasta"],
    ["Colombia", "Bogotá", "Medellín", "Cali", "Cartagena"],
    ["the Philippines", "Manila", "Cebu City", "Davao City", "Iloilo City"],
    ["Bangladesh", "Dhaka", "Chittagong", "Khulna", "Sylhet"],
    ["Finland", "Helsinki", "Turku", "Tampere", "Espoo"],
    ["the United Arab Emirates", "Abu Dhabi", "Dubai", "Sharjah", "Ajman"] ],
  [ ["Ethiopia", "Addis Ababa", "Dire Dawa", "Gondar", "Mekelle"],
    ["Ghana", "Accra", "Kumasi", "Tamale", "Cape Coast"],
    ["Ecuador", "Quito", "Guayaquil", "Cuenca", "Manta"],
    ["Jordan", "Amman", "Aqaba", "Irbid", "Zarqa"],
    ["Uzbekistan", "Tashkent", "Samarkand", "Bukhara", "Namangan"],
    ["Cuba", "Havana", "Santiago de Cuba", "Varadero", "Camagüey"] ],
  [ ["Belize", "Belmopan", "Belize City", "San Ignacio", "Orange Walk"],
    ["Côte d'Ivoire", "Yamoussoukro", "Abidjan", "Bouaké", "San-Pédro"],
    ["Malawi", "Lilongwe", "Blantyre", "Mzuzu", "Zomba"],
    ["Liechtenstein", "Vaduz", "Schaan", "Triesen", "Balzers"],
    ["Burkina Faso", "Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"],
    ["Kyrgyzstan", "Bishkek", "Osh", "Jalal-Abad", "Karakol"] ],
];

const TRUEFALSE2 = [
  [ ["The Moon makes its own light.", false, "It reflects light from the Sun."],
    ["Spiders are insects.", false, "They are arachnids, with eight legs instead of six."],
    ["A tomato is a fruit.", true, "Botanically it is a fruit because it holds seeds."],
    ["The Pacific is the largest ocean.", true, "It covers about a third of Earth's surface."],
    ["Snakes have eyelids.", false, "A clear scale covers and protects each eye."],
    ["Plants need sunlight to make their food.", true, "They use it for photosynthesis."] ],
  [ ["Ostriches bury their heads in the sand when scared.", false, "They lower their heads to turn their eggs, which looks like hiding."],
    ["Your heart is on the far left side of your chest.", false, "It sits near the centre, tilted slightly left."],
    ["Koalas are bears.", false, "They are marsupials, like kangaroos."],
    ["Mercury is the closest planet to the Sun.", true, "It orbits in just 88 days."],
    ["Some metals are light enough to float on water.", true, "Lithium, sodium and potassium all float."],
    ["Bulls get angry when they see the colour red.", false, "They react to the cape's movement, not its colour."] ],
  [ ["A group of crows is called a murder.", true, "It's an old English collective noun."],
    ["Electric eels are a kind of eel.", false, "They are knifefish, more closely related to catfish."],
    ["Water can boil and freeze at the same time.", true, "At its triple point, water is solid, liquid and gas at once."],
    ["Mount Kilimanjaro is in Kenya.", false, "It is in Tanzania."],
    ["The Great Pyramid was the tallest human-made structure for over 3,800 years.", true, "Until Lincoln Cathedral's spire around 1311."],
    ["Cracking your knuckles causes arthritis.", false, "Studies have found no link."] ],
  [ ["Pluto is classified as a planet.", false, "It has been a dwarf planet since 2006."],
    ["Polar bears have black skin under their white fur.", true, "Black skin helps soak up heat."],
    ["Lightning is hotter than the surface of the Sun.", true, "About 30,000 °C versus about 5,500 °C."],
    ["Albert Einstein failed maths at school.", false, "He excelled at maths from a young age."],
    ["Sloths can hold their breath longer than dolphins.", true, "Up to about 40 minutes, versus about 10."],
    ["We have summer because Earth is closer to the Sun then.", false, "Seasons come from Earth's tilt; it's closest to the Sun in January."] ],
  [ ["Octopuses can taste things with their arms.", true, "Their suckers are packed with taste receptors."],
    ["There are more trees on Earth than stars in the Milky Way.", true, "About 3 trillion trees versus a few hundred billion stars."],
    ["Mount Everest is still getting taller.", true, "Plate movement lifts it a few millimetres each year."],
    ["Bananas are slightly radioactive.", true, "They contain a little potassium-40."],
    ["Humans have only five senses.", false, "Balance, temperature and body position are senses too."],
    ["Daddy longlegs are the most venomous spiders but their fangs are too short to bite.", false, "That's a myth; they are harmless to people."] ],
];

const SCRAMBLE2 = [
  [ ["ROCKET", "It flies into space"], ["GARDEN", "Where flowers grow"], ["SCHOOL", "Where you learn"],
    ["PIRATE", "Sails the seas looking for treasure"], ["WINTER", "The coldest season"], ["PUZZLE", "A game you solve"] ],
  [ ["RAINBOW", "Seven colours after the rain"], ["PENGUIN", "A bird that swims but can't fly"], ["TEACHER", "Works in a classroom"],
    ["KITCHEN", "Where food is cooked"], ["CAPTAIN", "Leader of a team or ship"], ["BALLOON", "Filled with air or helium"] ],
  [ ["DINOSAUR", "Lived millions of years ago"], ["SANDWICH", "Filling between two slices of bread"], ["AIRPLANE", "Flies passengers around the world"],
    ["CALENDAR", "Shows the days and months"], ["COMPUTER", "You might be using one right now"], ["FOOTBALL", "A game played with a round ball"] ],
  [ ["ASTRONAUT", "Travels to space"], ["BLUEBERRY", "A small blue fruit"], ["LIGHTNING", "A flash in a storm"],
    ["PINEAPPLE", "A spiky tropical fruit"], ["DETECTIVE", "Solves mysteries"], ["SNOWFLAKE", "No two are alike"] ],
  [ ["MICROSCOPE", "Makes tiny things look big"], ["WATERMELON", "A big green fruit, red inside"], ["HELICOPTER", "Flies with spinning blades"],
    ["STRAWBERRY", "A red fruit with seeds on the outside"], ["GRASSHOPPER", "An insect that jumps far"], ["THUNDERSTORM", "Rain, thunder and lightning"] ],
];

/* ---------------------------------------------- Brainstack Level 3 content */
// Triple points. Harder questions, every answer has a worked note.
const OLYMPIAD3 = [
  [ ["What is the remainder when 2²⁰²⁶ is divided by 7?", "2", "1", "4", "3", "2³ = 8 leaves remainder 1, and 2026 = 3 × 675 + 1, so it's like 2¹."],
    ["How many positive divisors does 360 have?", "24", "20", "18", "36", "360 = 2³ × 3² × 5, so (3+1)(2+1)(1+1) = 24."],
    ["Five consecutive odd numbers add up to 125. What is the largest?", "29", "27", "31", "25", "The middle one is 125 ÷ 5 = 25, so 21, 23, 25, 27, 29."],
    ["What is the units digit of 7²⁰²⁶?", "9", "7", "3", "1", "Units digits cycle 7, 9, 3, 1 and 2026 leaves remainder 2 when divided by 4."],
    ["How many three-digit numbers are divisible by 9?", "100", "99", "101", "111", "From 108 to 999: (999 − 108) ÷ 9 + 1 = 100."],
    ["In how many different ways can the letters of LEVEL be arranged?", "30", "60", "120", "20", "5! ÷ (2! × 2!) because L and E each repeat."] ],
  [ ["How many zeros are at the end of 2026!?", "505", "405", "500", "506", "2026 ÷ 5 + ÷ 25 + ÷ 125 + ÷ 625 = 405 + 81 + 16 + 3."],
    ["What is the sum of all the positive divisors of 28?", "56", "28", "54", "64", "1 + 2 + 4 + 7 + 14 + 28. 28 is a perfect number."],
    ["If x + 1/x = 5, what is x² + 1/x²?", "23", "25", "27", "24", "Square both sides: x² + 2 + 1/x² = 25."],
    ["How many whole numbers from 1 to 100 are divisible by none of 2, 3 and 5?", "26", "27", "24", "30", "Inclusion–exclusion: 100 − (50 + 33 + 20 − 16 − 10 − 6 + 3) = 26."],
    ["The interior angles of a convex polygon add up to 1980°. How many sides does it have?", "13", "11", "12", "14", "(n − 2) × 180 = 1980, so n − 2 = 11."],
    ["A two-digit number is 4 times the sum of its digits. Reversing its digits makes it 27 bigger. What is it?", "36", "63", "24", "48", "10a + b = 4(a + b) gives b = 2a, and 9(b − a) = 27 gives b − a = 3."] ],
  [ ["What is the greatest common divisor of 2¹² − 1 and 2⁸ − 1?", "15", "3", "255", "7", "gcd(2ᵃ − 1, 2ᵇ − 1) = 2^gcd(a, b) − 1 = 2⁴ − 1."],
    ["How many ordered pairs of positive whole numbers (x, y) satisfy 1/x + 1/y = 1/6?", "9", "5", "8", "18", "It rearranges to (x − 6)(y − 6) = 36, and 36 has 9 divisors."],
    ["What is the remainder when 3¹⁰⁰ is divided by 13?", "3", "1", "9", "12", "3³ = 27 leaves remainder 1, and 100 = 3 × 33 + 1."],
    ["Moving only right or up along grid lines, how many paths cross a 4 × 4 square grid from one corner to the opposite one?", "70", "16", "35", "64", "Choose which 4 of the 8 moves go right: C(8, 4) = 70."],
    ["What is the smallest positive whole number with exactly 10 divisors?", "48", "80", "60", "512", "10 = 5 × 2, so try 2⁴ × 3 = 48."],
    ["a + b = 7 and ab = 10. What is a³ + b³?", "133", "343", "153", "117", "a³ + b³ = (a + b)³ − 3ab(a + b) = 343 − 210."] ],
  [ ["How many positive whole numbers below 1000 have digits that add up to 5?", "21", "15", "20", "28", "Share 5 among three digit places: C(7, 2) = 21."],
    ["What are the last two digits of 7¹⁰⁰?", "01", "49", "43", "07", "7⁴ = 2401 ends in 01, so every power of 7⁴ does too."],
    ["A circle fits exactly inside a square of side 10. What is the area inside the square but outside the circle?", "100 − 25π", "100 − 10π", "100 − 50π", "75π", "The circle has radius 5, so its area is 25π."],
    ["For how many n from 1 to 100 is n² + n divisible by 6?", "66", "33", "67", "50", "n(n + 1) is always even; it needs n ≡ 0 or 2 (mod 3)."],
    ["In how many ways can 10 identical sweets be shared among 3 children so each gets at least one?", "36", "45", "30", "28", "Stars and bars: C(9, 2) = 36."],
    ["What is 1/(1·2) + 1/(2·3) + 1/(3·4) + … + 1/(99·100)?", "99/100", "1", "100/101", "98/99", "Each term is 1/n − 1/(n + 1), so the sum telescopes to 1 − 1/100."] ],
  [ ["What is the remainder when 1! + 2! + 3! + … + 100! is divided by 12?", "9", "0", "3", "33", "From 4! on every term is a multiple of 12, leaving 1 + 2 + 6."],
    ["How many pairs of whole numbers (x, y) satisfy x² − y² = 2026?", "0", "2", "4", "8", "x² − y² is never 2 more than a multiple of 4, and 2026 is."],
    ["What is the largest power of 2 that divides 100!?", "2⁹⁷", "2⁵⁰", "2⁹⁶", "2¹⁰⁰", "50 + 25 + 12 + 6 + 3 + 1 = 97."],
    ["For how many whole numbers n is (n + 6)/(n − 1) also a whole number?", "4", "2", "8", "6", "It equals 1 + 7/(n − 1), so n − 1 is ±1 or ±7."],
    ["1 + 2 + 3 + … + n is a three-digit number whose digits are all the same. What is n?", "36", "37", "33", "27", "n(n + 1)/2 = 666 when n = 36."],
    ["If x² + x + 1 = 0, what is x³?", "1", "−1", "0", "x", "Multiply by (x − 1): x³ − 1 = 0."] ],
];

const CALCULUS3 = [
  [ ["d/dx (x³) = ?", "3x²", "x²", "3x³", "x⁴/4", "Power rule: bring the power down and reduce it by 1."],
    ["d/dx (7x) = ?", "7", "7x", "x", "0", "A straight line has a constant slope."],
    ["d/dx (5) = ?", "0", "5", "5x", "1", "A constant never changes, so its slope is 0."],
    ["lim (x → 2) of (3x + 1) = ?", "7", "6", "5", "9", "A polynomial is continuous, so just substitute x = 2."],
    ["∫ 2x dx = ?", "x² + C", "2x² + C", "x + C", "2 + C", "Reverse the power rule: raise the power, divide by it."],
    ["d/dx (x² + 4x) = ?", "2x + 4", "2x", "x + 4", "2x² + 4", "Differentiate term by term."] ],
  [ ["d/dx (sin x) = ?", "cos x", "−cos x", "−sin x", "tan x", "The slope of sin x at each point is cos x."],
    ["d/dx (eˣ) = ?", "eˣ", "x·eˣ⁻¹", "e", "ln x", "eˣ is its own derivative."],
    ["d/dx (ln x) = ?  (x > 0)", "1/x", "ln x / x", "x", "eˣ", "ln x and eˣ are inverses, which gives 1/x."],
    ["lim (x → 0) of (sin x)/x = ?", "1", "0", "∞", "It doesn't exist", "The famous limit behind d/dx (sin x) = cos x."],
    ["∫ from 0 to 2 of x dx = ?", "2", "4", "1", "8", "[x²/2] from 0 to 2 = 2 − 0."],
    ["What is the slope of y = x² at x = 3?", "6", "9", "3", "12", "y′ = 2x, so 2 × 3."] ],
  [ ["d/dx (x² sin x) = ?", "2x sin x + x² cos x", "2x cos x", "x² cos x", "2x sin x − x² cos x", "Product rule: u′v + uv′."],
    ["d/dx (sin 3x) = ?", "3 cos 3x", "cos 3x", "−3 cos 3x", "3 sin 3x", "Chain rule: multiply by the derivative of the inside, 3."],
    ["lim (x → 3) of (x² − 9)/(x − 3) = ?", "6", "0", "3", "9", "Factor: (x − 3)(x + 3)/(x − 3) = x + 3."],
    ["∫ cos x dx = ?", "sin x + C", "−sin x + C", "cos x + C", "−cos x + C", "Because d/dx (sin x) = cos x."],
    ["f(x) = x³ − 3x. Where does f have a local maximum?", "x = −1", "x = 1", "x = 0", "x = 3", "f′ = 3x² − 3 = 0 at x = ±1, and f″ = 6x is negative at −1."],
    ["d/dx (e²ˣ) = ?", "2e²ˣ", "e²ˣ", "2x·e²ˣ", "e²ˣ/2", "Chain rule: the inside 2x has derivative 2."] ],
  [ ["∫ from 0 to π of sin x dx = ?", "2", "0", "1", "π", "[−cos x] from 0 to π = 1 − (−1)."],
    ["d/dx (tan x) = ?", "sec² x", "cot x", "−csc² x", "sec x tan x", "Quotient rule on sin x / cos x gives 1/cos² x."],
    ["lim (x → ∞) of (3x² + 1)/(x² − 5) = ?", "3", "1", "0", "∞", "Same top power on both lines: divide the leading coefficients."],
    ["∫ (1/x) dx = ?  (x > 0)", "ln x + C", "1/x² + C", "−1/x² + C", "x ln x + C", "Because d/dx (ln x) = 1/x."],
    ["d/dx [ln(x² + 1)] = ?", "2x/(x² + 1)", "1/(x² + 1)", "2x·ln(x² + 1)", "1/(2x)", "Chain rule: (inside)′ / inside."],
    ["What is the area between y = x and y = x² for x from 0 to 1?", "1/6", "1/2", "1/3", "1/12", "∫ (x − x²) dx from 0 to 1 = 1/2 − 1/3."] ],
  [ ["∫ x·eˣ dx = ?", "(x − 1)eˣ + C", "x·eˣ + C", "(x + 1)eˣ + C", "x²eˣ/2 + C", "Integration by parts: x·eˣ − ∫ eˣ dx."],
    ["lim (x → 0) of (1 − cos x)/x² = ?", "1/2", "0", "1", "2", "cos x ≈ 1 − x²/2 near 0."],
    ["lim (n → ∞) of (1 + 1/n)ⁿ = ?", "e", "1", "∞", "2", "This limit is one definition of e ≈ 2.718."],
    ["∫ from 0 to 1 of 1/(1 + x²) dx = ?", "π/4", "π/2", "1", "ln 2", "The antiderivative is arctan x, and arctan 1 = π/4."],
    ["What is the sum of 1 + 1/2 + 1/4 + 1/8 + … forever?", "2", "1", "∞", "3/2", "A geometric series: a/(1 − r) = 1/(1 − 1/2)."],
    ["If y = xˣ (x > 0), what is dy/dx?", "xˣ(1 + ln x)", "x·xˣ⁻¹", "xˣ ln x", "xˣ", "Take logs: ln y = x ln x, then differentiate both sides."] ],
];

const SCIENCE3 = [
  [ ["What is the SI unit of power?", "Watt", "Joule", "Newton", "Pascal", "1 watt = 1 joule per second."],
    ["Which particle in an atom has no electric charge?", "Neutron", "Proton", "Electron", "Positron", "Protons are positive, electrons negative."],
    ["Roughly how fast does light travel in a vacuum?", "3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁵ m/s", "3 × 10¹⁰ m/s", "About 300,000 km every second."],
    ["About how strong is gravity's pull at Earth's surface?", "9.8 m/s²", "1.6 m/s²", "98 m/s²", "0.98 m/s²", "1.6 m/s² is the Moon's."],
    ["Which organelle holds most of a cell's DNA?", "Nucleus", "Ribosome", "Mitochondrion", "Cell membrane", "Mitochondria have a little DNA of their own, but most is in the nucleus."],
    ["Which gas do you breathe out more of than you breathe in?", "Carbon dioxide", "Oxygen", "Nitrogen", "Argon", "Your cells make CO₂ when they release energy."] ],
  [ ["Newton's second law says force equals…", "mass × acceleration", "mass × velocity", "mass ÷ acceleration", "weight × height", "F = ma."],
    ["What is the chemical formula of table salt?", "NaCl", "KCl", "NaOH", "CaCO₃", "Sodium chloride."],
    ["What is the atomic number of carbon?", "6", "12", "8", "14", "12 is its usual mass number."],
    ["Which kind of bond shares electrons between atoms?", "Covalent", "Ionic", "Metallic", "Hydrogen", "Ionic bonds transfer electrons instead."],
    ["Ohm's law links voltage, current and…", "resistance", "power", "charge", "frequency", "V = IR."],
    ["Which part of the brain controls balance and coordination?", "Cerebellum", "Cerebrum", "Medulla", "Hypothalamus", "It sits at the back, below the cerebrum."] ],
  [ ["A car starts from rest and accelerates at 2 m/s² for 5 s. How fast is it going?", "10 m/s", "2.5 m/s", "7 m/s", "25 m/s", "v = u + at = 0 + 2 × 5."],
    ["A solution has [H⁺] = 10⁻³ mol/L. What is its pH?", "3", "−3", "11", "7", "pH = −log₁₀[H⁺]."],
    ["How many chromosomes are in a normal human body cell?", "46", "23", "44", "48", "23 pairs; egg and sperm cells carry 23."],
    ["What is the kinetic energy of a 2 kg ball moving at 3 m/s?", "9 J", "6 J", "18 J", "3 J", "½mv² = ½ × 2 × 9."],
    ["Whose gold-foil experiment showed that an atom has a tiny, dense nucleus?", "Ernest Rutherford", "J. J. Thomson", "John Dalton", "Niels Bohr", "Rutherford's team, 1909–1911."],
    ["Which law says a gas's pressure is inversely proportional to its volume at constant temperature?", "Boyle's law", "Charles's law", "Hooke's law", "Avogadro's law", "pV stays constant."] ],
  [ ["What is the molar mass of water, H₂O?", "18 g/mol", "16 g/mol", "10 g/mol", "20 g/mol", "2 × 1 + 16."],
    ["Light passes from air into glass. What happens to its speed?", "It decreases", "It increases", "It stays the same", "It drops to zero", "That slowing is what makes it bend (refraction)."],
    ["100 g of a radioactive substance decays to 25 g in 10 years. What is its half-life?", "5 years", "10 years", "2.5 years", "20 years", "100 → 50 → 25 is two half-lives."],
    ["Which kind of cell division makes gametes with half the chromosomes?", "Meiosis", "Mitosis", "Osmosis", "Fertilisation", "Mitosis keeps the full number."],
    ["Three 6 Ω resistors are connected in parallel. What is their total resistance?", "2 Ω", "18 Ω", "6 Ω", "3 Ω", "1/R = 1/6 + 1/6 + 1/6 = 1/2."],
    ["Roughly what is Avogadro's number?", "6.02 × 10²³", "6.02 × 10²²", "3.0 × 10⁸", "9.81 × 10²³", "The number of particles in one mole."] ],
  [ ["A ball is thrown straight up. At its highest point, what is its acceleration?", "9.8 m/s² downward", "Zero", "9.8 m/s² upward", "It depends on the throw", "Its velocity is zero there, but gravity never switches off."],
    ["Which is heavier: one mole of hydrogen gas (H₂) or one mole of helium (He)?", "The helium", "The hydrogen", "They weigh the same", "It depends on the temperature", "About 4 g of helium against 2 g of H₂."],
    ["Astronauts on the ISS float mainly because…", "they are in continuous free fall", "there is no gravity in orbit", "they are above the atmosphere", "the station blocks gravity", "Gravity there is still about 90% as strong as on the ground."],
    ["If the distance between two masses doubles, the gravitational force between them becomes…", "one quarter", "one half", "double", "four times", "It follows an inverse-square law."],
    ["Which holds more thermal energy: a cup of boiling water or a bathtub of warm water?", "The bathtub", "The cup", "They're equal", "Neither", "Temperature isn't heat; the tub has far more water."],
    ["Which blood vessel carries oxygen-rich blood from the lungs to the heart?", "Pulmonary vein", "Pulmonary artery", "Aorta", "Vena cava", "The one vein that carries oxygenated blood."] ],
];

// Motivational thoughts. Quotes are attributed only where the source is well documented.
const THOUGHTS = [
  ["Pure mathematics is, in its way, the poetry of logical ideas.", "Albert Einstein"],
  ["Arise, awake, and stop not till the goal is reached.", "Swami Vivekananda"],
  ["Do not worry about your difficulties in mathematics. I can assure you mine are still greater.", "Albert Einstein"],
  ["Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.", "A. P. J. Abdul Kalam"],
  ["If I have seen further, it is by standing on the shoulders of giants.", "Isaac Newton"],
  ["Mathematics is not about numbers, equations, computations, or algorithms: it is about understanding.", "William Thurston"],
  ["The important thing is not to stop questioning.", "Albert Einstein"],
  ["Success is the sum of small efforts, repeated day in and day out.", "Robert Collier"],
  ["In mathematics the art of proposing a question must be held of higher value than solving it.", "Georg Cantor"],
  ["Nothing in life is to be feared, it is only to be understood.", "Marie Curie"],
  ["Hard questions don't mean you're slow. They mean you're growing.", ""],
  ["Every master was once stuck on Level 1. Keep stacking.", ""],
  ["Triple points need triple patience: read the question twice, answer once.", ""],
  ["A wrong answer is just a question you haven't finished learning from.", ""],
];

// Short lines shown after a miss in Brainstack Level 3.
const CHEERS = [
  "Tough one. Read the note and keep stacking.",
  "Level 3 is meant to push you. The next one's yours.",
  "Mistakes are how hard questions turn into easy ones.",
  "Shake it off. A new streak starts with the next answer.",
  "That's how champions train: miss, learn, go again.",
];

const REMIX_SOURCES = ["olympiad", "science", "trivia", "capitals", "math", "truefalse", "scramble"];

const BANKS = {
  1: { olympiad: OLYMPIAD, science: SCIENCE, trivia: TRIVIA, capitals: CAPITALS, truefalse: TRUEFALSE, scramble: SCRAMBLE },
  2: { olympiad: OLYMPIAD2, science: SCIENCE2, trivia: TRIVIA2, capitals: CAPITALS2, truefalse: TRUEFALSE2, scramble: SCRAMBLE2 },
  3: { olympiad: OLYMPIAD3, science: SCIENCE3, calculus: CALCULUS3 },
};

const PLAYER_COLORS = ["--m1", "--m2", "--m3", "--m4", "--m5", "--m6", "--m7"];

/* ------------------------------------------------------------------ helpers */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = n => Number(n).toLocaleString("en-US");
const modeById = (id, stage = state.stage) => modesFor(stage).find(m => m.id === id) || MODES.concat(MODES3).find(m => m.id === id) || MODES[0];
const PIN_MIN = 4, PIN_MAX = 8;
const isPin = v => /^\d{4,8}$/.test(v);
const initial = name => (name.trim()[0] || "?").toUpperCase();
const avatar = (a, size = "") => `<span class="avatar ${size}" style="--ac:var(${a.color})" aria-hidden="true">${esc(initial(a.name))}</span>`;
function randId(n) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"; let s = "";
  try { const b = crypto.getRandomValues(new Uint8Array(n)); b.forEach(x => s += chars[x % 36]); return s; }
  catch (e) { for (let i = 0; i < n; i++) s += chars[rnd(0, 35)]; return s; }
}
function ago(ts) {
  if (!ts) return "never";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now"; if (m < 60) return m + " min ago";
  const h = Math.round(m / 60); if (h < 24) return h + " h ago";
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : d + " days ago";
}
async function hashPin(salt, pin) {
  const text = "brainstack:" + salt + ":" + pin;
  try {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) { /* fall through */ }
  let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return "f" + (h >>> 0).toString(16);
}

/* ------------------------------------------------------------- math engine */
function mathQuestion(level) {
  let q, a;
  const pick = rnd(0, 2);
  if (level === 1) {
    if (pick < 2) { const x = rnd(2, 15), y = rnd(2, 15); q = `${x} + ${y}`; a = x + y; }
    else { const x = rnd(8, 20), y = rnd(1, x - 1); q = `${x} − ${y}`; a = x - y; }
  } else if (level === 2) {
    if (pick === 0) { const x = rnd(15, 75), y = rnd(12, 60); q = `${x} + ${y}`; a = x + y; }
    else if (pick === 1) { const x = rnd(40, 99), y = rnd(11, 39); q = `${x} − ${y}`; a = x - y; }
    else { const x = rnd(3, 10), y = rnd(3, 10); q = `${x} × ${y}`; a = x * y; }
  } else if (level === 3) {
    if (pick === 0) { const x = rnd(12, 49), y = rnd(3, 9); q = `${x} × ${y}`; a = x * y; }
    else if (pick === 1) { const y = rnd(3, 12), a0 = rnd(6, 25); q = `${a0 * y} ÷ ${y}`; a = a0; }
    else { const x = rnd(120, 480), y = rnd(110, 390); q = `${x} + ${y}`; a = x + y; }
  } else if (level === 4) {
    if (pick === 0) { const x = rnd(11, 39), y = rnd(11, 29); q = `${x} × ${y}`; a = x * y; }
    else if (pick === 1) { const x = rnd(5, 40), y = rnd(3, 12), z = rnd(3, 12); q = `${x} + ${y} × ${z}`; a = x + y * z; }
    else { const y = rnd(12, 25), a0 = rnd(12, 40); q = `${a0 * y} ÷ ${y}`; a = a0; }
  } else if (level === 5) {
    if (pick === 0) { const x = rnd(13, 35); q = `${x}²`; a = x * x; }
    else if (pick === 1) { const p = [5, 15, 25, 35, 45, 60, 75][rnd(0, 6)], y = rnd(2, 16) * 20; q = `${p}% of ${y}`; a = p * y / 100; }
    else { const x = rnd(12, 30), y = rnd(12, 30), z = rnd(20, 150); q = `(${x} × ${y}) − ${z}`; a = x * y - z; }
  // Levels 6–10 are Brainstack Level 2's Math Sprint levels 1–5.
  } else if (level === 6) {
    if (pick === 0) { const x = rnd(21, 59), y = rnd(11, 29); q = `${x} × ${y}`; a = x * y; }
    else if (pick === 1) { const x = rnd(400, 900), y = rnd(150, x - 50); q = `${x} − ${y}`; a = x - y; }
    else { const x = rnd(11, 25); q = `${x}²`; a = x * x; }
  } else if (level === 7) {
    if (pick === 0) { const y = rnd(11, 25), a0 = rnd(11, 40); q = `${a0 * y} ÷ ${y}`; a = a0; }
    else if (pick === 1) { const p = [10, 20, 25, 30, 40, 50, 75][rnd(0, 6)], y = rnd(4, 40) * 20; q = `${p}% of ${y}`; a = p * y / 100; }
    else { const x = rnd(26, 50); q = `${x}²`; a = x * x; }
  } else if (level === 8) {
    if (pick === 0) { const w = rnd(6, 15), x = rnd(6, 15), y = rnd(6, 15), z = rnd(6, 15); q = `${w} × ${x} + ${y} × ${z}`; a = w * x + y * z; }
    else if (pick === 1) { const d = [3, 4, 5, 8][rnd(0, 3)], n = rnd(1, d - 1), y = d * rnd(5, 30); q = `${n}/${d} of ${y}`; a = n * y / d; }
    else { const x = rnd(101, 499), y = rnd(3, 9); q = `${x} × ${y}`; a = x * y; }
  } else if (level === 9) {
    if (pick === 0) { const x = rnd(2, 12); q = `${x}³`; a = x * x * x; }
    else if (pick === 1) { const x = rnd(11, 30); q = `√${x * x}`; a = x; }
    else { const x = rnd(20, 60), y = rnd(10, x - 1); q = `${x}² − ${y}²`; a = x * x - y * y; }
  } else {
    if (pick === 0) { const x = rnd(12, 40), y = rnd(12, 40), z = rnd(11, 19); q = `(${x} + ${y}) × ${z}`; a = (x + y) * z; }
    else if (pick === 1) { const price = rnd(2, 40) * 50, p = [10, 20, 40][rnd(0, 2)]; q = `${price} increased by ${p}%`; a = price * (100 + p) / 100; }
    else { const n = rnd(7, 12); q = `2^${n}`; a = 2 ** n; }
  }
  const spread = Math.max(2, Math.round(Math.abs(a) * 0.12));
  const wrong = new Set();
  let guard = 0;
  while (wrong.size < 3 && guard++ < 100) {
    const off = [1, -1, 10, -10, 2, -2][rnd(0, 5)] * (rnd(0, 1) ? 1 : rnd(1, spread));
    const w = a + off;
    if (w !== a && w >= 0) wrong.add(w);
  }
  return { q: `${q} = ?`, answer: String(a), options: shuffle([a, ...wrong].map(String)) };
}

function scrambleWord(w) {
  let s = w, guard = 0;
  while (s === w && guard++ < 20) s = shuffle(w.split("")).join("");
  return s;
}

const mcRow = ([q, a, w1, w2, w3, note]) => ({ q, answer: a, options: shuffle([a, w1, w2, w3]), note });

// Remix: one question from each of six different Level 1/2 games, at this level's difficulty.
function remixRound(level) {
  const pool = [];
  [1, 2].forEach(st => REMIX_SOURCES.forEach(mode => {
    const src = MODES.find(m => m.id === mode);
    buildRound(mode, level, st).forEach(q => pool.push({ ...q, kind: src.kind, src: mode, tag: `${STAGE_NAME[st]} · ${src.name}` }));
  }));
  const picked = [], used = new Set();
  for (const q of shuffle(pool)) {
    if (picked.length >= PER_ROUND) break;
    if (!used.has(q.src)) { used.add(q.src); picked.push(q); }
  }
  return picked;
}

function buildRound(mode, level, stage = 1) {
  if (mode === "remix") return remixRound(level);
  const i = level - 1, bank = BANKS[stage][mode];
  let qs;
  if (mode === "olympiad" || mode === "science" || mode === "trivia" || mode === "calculus") qs = bank[i].map(mcRow);
  else if (mode === "capitals") qs = bank[i].map(([c, a, ...w]) => ({ q: `What is the capital of ${c}?`, answer: a, options: shuffle([a, ...w]) }));
  else if (mode === "truefalse") qs = bank[i].map(([q, t, note]) => ({ q, answer: t ? "True" : "False", options: ["True", "False"], note }));
  else if (mode === "scramble") qs = bank[i].map(([w, hint]) => ({ q: "Unscramble this word", answer: w, letters: scrambleWord(w), hint }));
  else {
    const seen = new Set(); qs = [];
    while (qs.length < PER_ROUND) { const m = mathQuestion(level + (stage - 1) * LEVELS); if (!seen.has(m.q)) { seen.add(m.q); qs.push(m); } }
  }
  return shuffle(qs).slice(0, PER_ROUND);
}

/* ------------------------------------------------------------------ storage */
// Players and games live in the signed-in viewer's private store, mirrored in this browser as a fallback.
// Docs: "acct-<id>" per player, "g-<id>" per finished game (with an `acct` field).
const LS_KEY = "brainstack.v2", LS_LEGACY = "brainstack.v1", SS_ACTIVE = "brainstack.active", SS_STAGE = "brainstack.stage";
const state = { accounts: [], games: [], active: null, stage: 1, recovery: false, legacy: { games: [], unlocked: {} }, cloud: null };
const freshUnlocked = (stage = 1) => Object.fromEntries(modesFor(stage).map(m => [m.id, 1]));

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { const d = JSON.parse(raw); state.accounts = d.accounts || []; state.games = d.games || []; }
    const old = localStorage.getItem(LS_LEGACY);
    if (old) { const d = JSON.parse(old); state.legacy.games = (d.games || []).filter(g => !g.acct); state.legacy.unlocked = d.unlocked || {}; }
  } catch (e) { /* storage unavailable */ }
  try { const id = sessionStorage.getItem(SS_ACTIVE); if (id && state.accounts.some(a => a.id === id)) state.active = id; } catch (e) { /* ignore */ }
  try { const s = Number(sessionStorage.getItem(SS_STAGE)); if (s === 2 || s === 3) state.stage = s; } catch (e) { /* ignore */ }
}
function writeLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ accounts: state.accounts, games: state.games })); } catch (e) { /* ignore */ }
}
function setActive(id) {
  state.active = id;
  try { if (id) sessionStorage.setItem(SS_ACTIVE, id); else sessionStorage.removeItem(SS_ACTIVE); } catch (e) { /* ignore */ }
}
const cloudSet = (id, data) => { if (state.cloud) state.cloud.col.doc(id).set(data).catch(() => { $("#sync").textContent = "Couldn't reach your account; saved in this browser"; }); };
const cloudDel = id => state.cloud ? state.cloud.col.doc(id).delete().catch(() => {}) : Promise.resolve();

function persistAccount(a) { a.updated = Date.now(); writeLocal(); cloudSet("acct-" + a.id, a); }
function persistGame(g) { writeLocal(); cloudSet(g.id, g); }

async function initCloud() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!db || !user) return;
    const uid = await user.id();
    if (!uid) return;
    const col = db.collection("data/users/" + uid);
    const snap = await col.get();
    const cAcc = [], cGames = [], cLegacy = [];
    let cLegacyUnl = null;
    snap.docs.forEach(d => {
      if (!d.exists) return;
      const v = d.data();
      if (d.id.startsWith("acct-")) cAcc.push(v);
      else if (d.id.startsWith("g-")) (v.acct ? cGames : cLegacy).push(v);
      else if (d.id === "progress") cLegacyUnl = v.unlocked || {};
    });
    state.cloud = { col };

    const accMap = new Map(state.accounts.map(a => [a.id, a]));
    const pushAcc = new Set(state.accounts.map(a => a.id));
    cAcc.forEach(a => {
      const mine = accMap.get(a.id);
      if (!mine || (a.updated || 0) >= (mine.updated || 0)) accMap.set(a.id, JSON.parse(JSON.stringify(a)));
      if (!mine || (a.updated || 0) >= (mine.updated || 0)) pushAcc.delete(a.id);
    });
    state.accounts = [...accMap.values()];
    const gameIds = new Set(cGames.map(g => g.id));
    const localOnly = state.games.filter(g => !gameIds.has(g.id));
    state.games = cGames.map(g => ({ ...g })).concat(localOnly).sort((a, b) => b.ts - a.ts);

    const legIds = new Set(state.legacy.games.map(g => g.id));
    cLegacy.forEach(g => { if (!legIds.has(g.id)) state.legacy.games.push({ ...g }); });
    if (cLegacyUnl) MODES.forEach(m => state.legacy.unlocked[m.id] = Math.max(state.legacy.unlocked[m.id] || 1, cLegacyUnl[m.id] || 1));

    state.accounts.filter(a => pushAcc.has(a.id)).forEach(a => cloudSet("acct-" + a.id, a));
    localOnly.forEach(g => cloudSet(g.id, g));
    writeLocal();
    if (state.active && !state.accounts.some(a => a.id === state.active)) setActive(null);
    $("#sync").textContent = "Players saved to your Claude account";
    if (screen.name !== "game") render(); else renderHeader();
  } catch (e) {
    $("#sync").textContent = "Saving players in this browser";
  }
}

function claimLegacy(a) {
  if (!state.legacy.games.length) return 0;
  const n = state.legacy.games.length;
  state.legacy.games.forEach(g => { g.acct = a.id; state.games.push(g); cloudSet(g.id, g); });
  state.games.sort((x, y) => y.ts - x.ts);
  MODES.forEach(m => a.unlocked[m.id] = Math.max(a.unlocked[m.id] || 1, state.legacy.unlocked[m.id] || 1));
  state.legacy = { games: [], unlocked: {} };
  try { localStorage.removeItem(LS_LEGACY); } catch (e) { /* ignore */ }
  cloudDel("progress");
  return n;
}

// Backup codes carry a player (with hashed PINs) and their games between copies of Brainstack.
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
function cleanGame(g) {
  const out = { id: String(g.id), ts: num(g.ts), acct: String(g.acct), mode: String(g.mode), level: Math.min(LEVELS, Math.max(1, num(g.level))),
    correct: num(g.correct), total: num(g.total) || PER_ROUND, points: num(g.points), passed: !!g.passed, bestStreak: num(g.bestStreak) };
  if (g.stage === 2 || g.stage === 3) out.stage = g.stage;
  return out;
}
function cleanUnlocked(u) { const o = {}; if (u && typeof u === "object") Object.keys(u).forEach(k => { if (/^[a-z]+$/.test(k)) o[k] = Math.min(LEVELS, Math.max(1, num(u[k]))); }); return o; }
function importData(d) {
  if (!d || !Array.isArray(d.accounts) || !Array.isArray(d.games)) throw new Error("not a Brainstack backup");
  let players = 0, games = 0;
  d.accounts.forEach(x => {
    if (!x || typeof x.id !== "string" || typeof x.name !== "string" || typeof x.salt !== "string" || typeof x.pin !== "string") return;
    const cur = state.accounts.find(a => a.id === x.id);
    if (cur && num(cur.updated) >= num(x.updated)) return;
    const a = { id: x.id, name: x.name.slice(0, 20), color: PLAYER_COLORS.includes(x.color) ? x.color : "--m1", salt: x.salt, pin: x.pin,
      backup: typeof x.backup === "string" ? x.backup : x.pin, created: num(x.created), updated: num(x.updated), lastUsed: num(x.lastUsed),
      unlocked: cleanUnlocked(x.unlocked) };
    if (x.unlocked2) a.unlocked2 = cleanUnlocked(x.unlocked2);
    if (x.unlocked3) a.unlocked3 = cleanUnlocked(x.unlocked3);
    if (x.seen2) a.seen2 = true;
    if (x.seen3) a.seen3 = true;
    if (cur) Object.assign(cur, a); else state.accounts.push(a);
    cloudSet("acct-" + a.id, a); players++;
  });
  const ids = new Set(state.games.map(g => g.id));
  d.games.forEach(g => {
    if (!g || typeof g.id !== "string" || !g.id.startsWith("g-") || ids.has(g.id) || !state.accounts.some(a => a.id === g.acct)) return;
    const c = cleanGame(g); state.games.push(c); ids.add(c.id); cloudSet(c.id, c); games++;
  });
  state.games.sort((x, y) => y.ts - x.ts);
  writeLocal();
  return { players, games };
}

/* ------------------------------------------------------------------- stats */
const me = () => state.accounts.find(a => a.id === state.active) || null;
const gamesOf = id => state.games.filter(g => g.acct === id);
const myGames = () => gamesOf(state.active);
const pointsOf = id => gamesOf(id).reduce((s, g) => s + g.points, 0);
const stageOf = g => g.stage || 1;
const inStage = (g, mode, level, stage) => g.mode === mode && g.level === level && stageOf(g) === stage;
const clearedCountOf = (id, stage = 1) => new Set(gamesOf(id).filter(g => g.passed && stageOf(g) === stage).map(g => g.mode + g.level)).size;
const bestFor = (mode, level, stage = state.stage) => myGames().filter(g => inStage(g, mode, level, stage)).reduce((m, g) => Math.max(m, g.points), 0);
const clearedFor = (mode, level, stage = state.stage) => myGames().some(g => inStage(g, mode, level, stage) && g.passed);
const unlockKey = stage => stage === 3 ? "unlocked3" : stage === 2 ? "unlocked2" : "unlocked";
const unlockedOf = (mode, stage = state.stage) => { const a = me(); return a ? ((a[unlockKey(stage)] || {})[mode] || 1) : 1; };
const TOTAL_LEVELS = MODES.length * LEVELS;
const stage2Progress = id => ({ levels: clearedCountOf(id, 1), games: gamesOf(id).length });
const stage2Open = id => { const p = stage2Progress(id); return p.levels >= TOTAL_LEVELS && p.games >= STAGE2_GAMES; };
const LEVELS3 = MODES3.length * LEVELS;
const stage3Open = id => clearedCountOf(id, 2) >= TOTAL_LEVELS;
const stageOpen = (id, s) => s === 1 || (s === 2 ? stage2Open(id) : s === 3 ? stage3Open(id) : false);
const bsTag = st => st > 1 ? "BS" + st + " · " : "";
const dayIndex = () => Math.floor(Date.now() / 86400000);
function thoughtCard(i, label = "Thought for today") {
  const k = ((i % THOUGHTS.length) + THOUGHTS.length) % THOUGHTS.length, [text, by] = THOUGHTS[k];
  return `<div class="thought" id="thought" data-i="${k}" data-label="${esc(label)}"><div class="thought-row"><span class="label">${esc(label)}</span>
    <button class="link" id="next-thought" type="button">Another thought</button></div>
    <q>${esc(text)}</q>${by ? `<span class="by">${esc(by)}</span>` : ""}</div>`;
}
function wireThought() {
  const b = $("#next-thought");
  if (b) b.addEventListener("click", () => { const t = $("#thought"); t.outerHTML = thoughtCard(Number(t.dataset.i) + 1, t.dataset.label); wireThought(); });
}
function confetti() {
  try { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) { /* ignore */ }
  const box = document.createElement("div"); box.className = "confetti"; box.setAttribute("aria-hidden", "true");
  const cols = ["--m1", "--m2", "--m3", "--m4", "--m5", "--m6", "--m7", "--gold"];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement("i");
    p.style.left = rnd(0, 100) + "%"; p.style.background = `var(${cols[i % cols.length]})`;
    p.style.animationDuration = (1.6 + Math.random() * 1.6) + "s"; p.style.animationDelay = (Math.random() * 0.4) + "s";
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
}
function setStage(n) { state.stage = n; try { sessionStorage.setItem(SS_STAGE, String(n)); } catch (e) { /* ignore */ } }

/* ------------------------------------------------------------------ screens */
const view = $("#view");
let screen = { name: "players" };
let game = null;
let tick = null;
const attempts = {}; // per player: { n, until }

$("#tab-play").addEventListener("click", () => { if (game) quitGame(); go({ name: "home" }); });
$("#tab-records").addEventListener("click", () => { if (game) quitGame(); go({ name: "records" }); });
$("#tab-account").addEventListener("click", () => { if (game) quitGame(); go({ name: "account" }); });

function go(s) { screen = s; render(); window.scrollTo({ top: 0 }); }

function renderHeader() {
  const a = me();
  const right = $("#head-right");
  $("#tabs").hidden = !a;
  if (a) {
    right.innerHTML = `<div class="total" title="Points earned across every game ${esc(a.name)} has played">
        <span class="label">Points</span><span class="num">${fmt(pointsOf(a.id))}</span></div>
      <button class="who" id="who" style="--ac:var(${a.color})" title="Account settings">${avatar(a)}<span>${esc(a.name)}</span></button>
      <button class="btn ghost sm" id="switch">Switch player</button>`;
    $("#who").addEventListener("click", () => { if (game) quitGame(); go({ name: "account" }); });
    $("#switch").addEventListener("click", () => { if (game) quitGame(); signOut(); });
  } else {
    right.innerHTML = state.accounts.length ? `<span class="hint">${state.accounts.length} player${state.accounts.length === 1 ? "" : "s"}</span>` : "";
  }
  const tab = screen.name === "records" ? "records" : screen.name === "account" ? "account" : "play";
  ["play", "records", "account"].forEach(t => $("#tab-" + t).setAttribute("aria-selected", String(t === tab)));
}

function render() {
  const needsPlayer = ["home", "levels", "result", "records", "account", "game"];
  if (!me() && needsPlayer.includes(screen.name)) screen = { name: "players" };
  renderHeader();
  if (screen.name === "players") renderPlayers();
  else if (screen.name === "pin") renderPin();
  else if (screen.name === "create") renderCreate();
  else if (screen.name === "home") renderHome();
  else if (screen.name === "levels") renderLevels(screen.mode);
  else if (screen.name === "result") renderResult(screen.rec, screen.recap, screen.newUnlock, screen.stage2New, screen.stage3New);
  else if (screen.name === "records") renderRecords();
  else if (screen.name === "account") renderAccount();
}

function signOut() { setActive(null); state.recovery = false; go({ name: "players" }); }

/* ------------------------------------------------------------ player list */
function renderPlayers() {
  const list = state.accounts.slice().sort((x, y) => (y.lastUsed || 0) - (x.lastUsed || 0));
  const cards = list.map(a => `<button class="player" style="--ac:var(${a.color})" data-acct="${a.id}" aria-label="Open ${esc(a.name)}">
      <div class="player-row">${avatar(a, "md")}<div style="min-width:0"><b>${esc(a.name)}</b><div class="fine">Last played ${ago(a.lastUsed)}</div></div></div>
      <div class="player-stats"><span><span class="num">${fmt(pointsOf(a.id))}</span> pts</span><span>${stage3Open(a.id) ? `<span class="chip gold">BS3</span> <span class="num">${clearedCountOf(a.id, 3)}</span>/${LEVELS3}` : stage2Open(a.id) ? `<span class="chip accent" style="--mc:var(--accent)">BS2</span> <span class="num">${clearedCountOf(a.id, 2)}</span>/${TOTAL_LEVELS}` : `<span class="num">${clearedCountOf(a.id)}</span>/${TOTAL_LEVELS} levels`}</span></div>
    </button>`).join("");
  const legacyNote = state.legacy.games.length
    ? `<div class="banner">${state.legacy.games.length} game${state.legacy.games.length === 1 ? "" : "s"} from before accounts existed will be added to the first player you create.</div>` : "";
  view.innerHTML = `<section style="display:grid;gap:16px">
    <div class="section-head"><h2>Who's playing?</h2><p>Tap your name, then enter your PIN.</p></div>
    ${legacyNote}
    <div class="players">${cards}
      <button class="player new" id="new-player"><span class="plus">+</span><span>New player</span></button>
    </div>
    ${list.length ? "" : `<p class="hint" style="margin:0">No players yet. Create one to start playing; each player keeps their own levels, points and history.</p>`}
    <div id="restore"><button class="link" id="restore-open" type="button">Restore a player from a backup code</button></div>
  </section>`;
  view.querySelectorAll("[data-acct]").forEach(b => b.addEventListener("click", () => go({ name: "pin", id: b.dataset.acct, mode: "pin", entry: "", msg: "" })));
  $("#new-player").addEventListener("click", () => go({ name: "create" }));
  $("#restore-open").addEventListener("click", () => {
    $("#restore").innerHTML = `<div class="card"><h3>Restore from a backup code</h3>
      <p class="hint">Paste the code from <b>Account → Back up progress</b> in another copy of Brainstack.</p>
      <textarea class="code-box" id="restore-text" aria-label="Backup code" spellcheck="false"></textarea>
      <p class="msg" id="restore-msg" aria-live="polite"></p>
      <div class="actions" style="justify-content:flex-start"><button class="btn" id="restore-go" type="button">Restore</button><button class="btn ghost" id="restore-cancel" type="button">Cancel</button></div></div>`;
    $("#restore-cancel").addEventListener("click", renderPlayers);
    $("#restore-go").addEventListener("click", () => {
      const msg = $("#restore-msg");
      try {
        const r = importData(JSON.parse($("#restore-text").value));
        if (!r.players && !r.games) { msg.className = "msg err"; msg.textContent = "Nothing new in that code: this copy already has the same or newer progress."; return; }
        renderPlayers(); renderHeader();
      } catch (e) { msg.className = "msg err"; msg.textContent = "That doesn't look like a Brainstack backup code. Copy the whole code and try again."; }
    });
  });
}

/* ---------------------------------------------------------------- PIN pad */
function lockLeft(id) { const t = attempts[id]; return t && t.until > Date.now() ? Math.ceil((t.until - Date.now()) / 1000) : 0; }

function renderPin() {
  const a = state.accounts.find(x => x.id === screen.id);
  if (!a) return go({ name: "players" });
  const backup = screen.mode === "backup";
  const locked = lockLeft(a.id);
  const slots = Math.min(PIN_MAX, Math.max(PIN_MIN, screen.entry.length));
  const dots = Array.from({ length: slots }, (_, i) => `<span class="${i < screen.entry.length ? "on" : ""}"></span>`).join("");
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}" ${locked ? "disabled" : ""}>${n}</button>`).join("");
  view.innerHTML = `<section style="display:grid;gap:14px">
    <button class="back" id="back">← All players</button>
    <div class="pin-panel" style="--ac:var(${a.color})">
      ${avatar(a, "lg")}
      <h2>${esc(a.name)}</h2>
      <p class="hint" style="margin:0">${backup ? "Enter your <b>backup PIN</b>" : "Enter your PIN"}</p>
      <div class="pdots ${screen.shake ? "shake" : ""}" aria-label="${screen.entry.length} digits entered">${dots}</div>
      <p class="msg ${screen.msgOk ? "ok" : "err"}" id="pin-msg" aria-live="polite">${locked ? `Too many tries. Wait ${locked} s.` : esc(screen.msg || "")}</p>
      <div class="keypad">${keys}
        <button class="soft" data-k="clear" ${locked ? "disabled" : ""}>Clear</button>
        <button data-k="0" ${locked ? "disabled" : ""}>0</button>
        <button class="soft" data-k="del" ${locked ? "disabled" : ""} aria-label="Delete last digit">⌫</button>
        <button class="ok" data-k="ok" ${locked || screen.entry.length < PIN_MIN ? "disabled" : ""}>Enter</button>
      </div>
      ${backup ? `<button class="link" id="swap">Use my regular PIN</button>` : `<button class="link" id="swap">Forgot your PIN? Use backup PIN</button>`}
    </div>
  </section>`;
  screen.shake = false;
  $("#back").addEventListener("click", () => go({ name: "players" }));
  $("#swap").addEventListener("click", () => { screen.mode = backup ? "pin" : "backup"; screen.entry = ""; screen.msg = ""; renderPin(); });
  view.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => pinKey(b.dataset.k)));
  if (locked) setTimeout(() => { if (screen.name === "pin" && screen.id === a.id) renderPin(); }, 1000);
}

async function pinKey(k) {
  if (screen.name !== "pin" || screen.busy) return;
  const a = state.accounts.find(x => x.id === screen.id);
  if (!a || lockLeft(a.id)) return;
  if (k === "del") screen.entry = screen.entry.slice(0, -1);
  else if (k === "clear") screen.entry = "";
  else if (/^\d$/.test(k) && screen.entry.length < PIN_MAX) screen.entry += k;
  screen.msg = "";
  if (k !== "ok" || screen.entry.length < PIN_MIN) return renderPin();
  screen.busy = true;
  const which = screen.mode === "backup" ? "backup" : "pin";
  const ok = (await hashPin(a.salt, screen.entry)) === a[which];
  screen.busy = false;
  if (ok) {
    delete attempts[a.id];
    setActive(a.id);
    setStage(stage3Open(a.id) && a.seen3 ? 3 : stage2Open(a.id) && a.seen2 ? 2 : 1);
    a.lastUsed = Date.now();
    persistAccount(a);
    state.recovery = which === "backup";
    go(state.recovery ? { name: "account" } : { name: "home" });
    return;
  }
  const t = attempts[a.id] || (attempts[a.id] = { n: 0, until: 0 });
  t.n++;
  if (t.n >= 5) { t.n = 0; t.until = Date.now() + 30000; }
  screen.entry = "";
  screen.shake = true;
  screen.msg = which === "pin" ? "That PIN isn't right. Try again, or use your backup PIN below." : "That backup PIN isn't right. Try again.";
  renderPin();
}

/* --------------------------------------------------------- create player */
function swatches(name, selected) {
  return `<div class="swatches" role="radiogroup" aria-label="Colour">${PLAYER_COLORS.map((c, i) =>
    `<label class="swatch" style="--ac:var(${c})"><input type="radio" name="${name}" id="${name}-${i}" value="${c}" ${c === selected ? "checked" : ""}><span title="Colour ${i + 1}"></span></label>`).join("")}</div>`;
}

function renderCreate() {
  const used = new Set(state.accounts.map(a => a.color));
  const color = PLAYER_COLORS.find(c => !used.has(c)) || PLAYER_COLORS[0];
  const legacy = !state.accounts.length && state.legacy.games.length;
  view.innerHTML = `<section style="display:grid;gap:14px;max-width:560px">
    <button class="back" id="back">← All players</button>
    <form class="card" id="create-form" autocomplete="off" novalidate>
      <h2 style="font-size:22px">New player</h2>
      ${legacy ? `<div class="banner">Your ${state.legacy.games.length} earlier game${state.legacy.games.length === 1 ? "" : "s"} will be added to this player.</div>` : ""}
      <div class="field"><label for="c-name">Name</label><input class="input" id="c-name" maxlength="20" placeholder="e.g. Maya"></div>
      <div class="field"><label>Colour</label>${swatches("c-color", color)}</div>
      <div class="row2">
        <div class="field"><label for="c-pin">PIN (4 to 8 digits)</label><input class="input pin" id="c-pin" type="password" inputmode="numeric" maxlength="8" pattern="[0-9]*"></div>
        <div class="field"><label for="c-pin2">Repeat PIN</label><input class="input pin" id="c-pin2" type="password" inputmode="numeric" maxlength="8" pattern="[0-9]*"></div>
      </div>
      <div class="row2">
        <div class="field"><label for="c-bak">Backup PIN</label><input class="input pin" id="c-bak" type="password" inputmode="numeric" maxlength="8" pattern="[0-9]*"></div>
        <div class="field"><label for="c-bak2">Repeat backup PIN</label><input class="input pin" id="c-bak2" type="password" inputmode="numeric" maxlength="8" pattern="[0-9]*"></div>
      </div>
      <p class="msg err" id="c-msg" aria-live="polite"></p>
      <div class="actions" style="justify-content:flex-start"><button class="btn" type="submit">Create player</button></div>
    </form>
  </section>`;
  $("#back").addEventListener("click", () => go({ name: "players" }));
  $("#c-name").focus();
  $("#create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#c-name").value.trim().replace(/\s+/g, " ");
    const pin = $("#c-pin").value, pin2 = $("#c-pin2").value, bak = $("#c-bak").value, bak2 = $("#c-bak2").value;
    const col = (view.querySelector('input[name="c-color"]:checked') || {}).value || color;
    const msg = $("#c-msg");
    if (!name) return msg.textContent = "Enter a name for this player.";
    if (state.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) return msg.textContent = `There's already a player called ${name}. Pick another name.`;
    if (!isPin(pin)) return msg.textContent = "Your PIN must be 4 to 8 digits.";
    if (pin !== pin2) return msg.textContent = "The two PINs don't match.";
    if (!isPin(bak)) return msg.textContent = "Your backup PIN must be 4 to 8 digits.";
    if (bak !== bak2) return msg.textContent = "The two backup PINs don't match.";
    if (bak === pin) return msg.textContent = "Your backup PIN must be different from your PIN.";
    const salt = randId(12);
    const a = { id: "a" + randId(10), name, color: col, salt, pin: await hashPin(salt, pin), backup: await hashPin(salt, bak),
                created: Date.now(), updated: Date.now(), lastUsed: Date.now(), unlocked: freshUnlocked() };
    state.accounts.push(a);
    claimLegacy(a);
    persistAccount(a);
    setActive(a.id);
    setStage(1);
    go({ name: "home" });
  });
}

/* --------------------------------------------------------- account page */
function renderAccount() {
  const a = me();
  const pinField = (id, label) => `<div class="field"><label for="${id}">${label}</label><input class="input pin" id="${id}" type="password" inputmode="numeric" maxlength="8" pattern="[0-9]*"></div>`;
  view.innerHTML = `<section style="display:grid;gap:16px;--ac:var(${a.color})">
    <div class="player-row">${avatar(a, "md")}<div><h2 style="font-size:24px">${esc(a.name)}</h2>
      <div class="fine">Player since ${new Date(a.created).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${fmt(pointsOf(a.id))} points · ${myGames().length} games</div></div></div>
    ${state.recovery ? `<div class="banner"><b>You signed in with your backup PIN.</b> Set a new regular PIN below so you remember it next time.</div>` : ""}
    <div class="settings">
      <form class="card" id="f-pin" novalidate>
        <h3>Change PIN</h3>
        ${state.recovery ? "" : pinField("p-cur", "Current PIN or backup PIN")}
        <div class="row2">${pinField("p-new", "New PIN")}${pinField("p-new2", "Repeat new PIN")}</div>
        <p class="msg" id="p-msg" aria-live="polite"></p>
        <div><button class="btn" type="submit">Save new PIN</button></div>
      </form>
      <form class="card" id="f-bak" novalidate>
        <h3>Change backup PIN</h3>
        ${pinField("b-cur", "Current PIN")}
        <div class="row2">${pinField("b-new", "New backup PIN")}${pinField("b-new2", "Repeat backup PIN")}</div>
        <p class="msg" id="b-msg" aria-live="polite"></p>
        <div><button class="btn" type="submit">Save backup PIN</button></div>
      </form>
      <form class="card" id="f-name" novalidate>
        <h3>Name and colour</h3>
        <div class="field"><label for="n-name">Name</label><input class="input" id="n-name" maxlength="20" value="${esc(a.name)}"></div>
        <div class="field"><label>Colour</label>${swatches("n-color", a.color)}</div>
        <p class="msg" id="n-msg" aria-live="polite"></p>
        <div><button class="btn" type="submit">Save</button></div>
      </form>
      <div class="card" id="f-backup">
        <h3>Back up progress</h3>
        <p class="hint">Copy a code holding ${esc(a.name)}'s levels, points and history, then paste it into another copy of Brainstack (for example one saved in VS Code) under <b>Restore a player</b>. It contains your PINs in scrambled form, so keep it private.</p>
        <div id="bk-out"><button class="btn ghost" type="button" id="bk-make">Show backup code</button></div>
      </div>
      <form class="card" id="f-del" novalidate>
        <h3>Delete player</h3>
        <p class="hint">Removes ${esc(a.name)} with all ${myGames().length} games and level progress. This can't be undone.</p>
        ${pinField("d-pin", "Enter your PIN to confirm")}
        <p class="msg" id="d-msg" aria-live="polite"></p>
        <div class="actions" style="justify-content:flex-start" id="d-actions"><button class="btn ghost" type="submit">Delete player…</button></div>
      </form>
    </div>
  </section>`;

  const say = (id, text, ok) => { const el = $(id); el.textContent = text; el.className = "msg " + (ok ? "ok" : "err"); };
  $("#bk-make").addEventListener("click", () => {
    const code = JSON.stringify({ brainstack: 3, accounts: [a], games: myGames() });
    $("#bk-out").innerHTML = `<textarea class="code-box" id="bk-text" readonly aria-label="Backup code" spellcheck="false">${esc(code)}</textarea>
      <div class="actions" style="justify-content:flex-start;margin-top:8px"><button class="btn" type="button" id="bk-copy">Copy code</button><span class="msg ok" id="bk-msg" aria-live="polite"></span></div>`;
    const ta = $("#bk-text"); ta.focus(); ta.select();
    $("#bk-copy").addEventListener("click", async () => {
      ta.select();
      let ok = false;
      try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } }
      $("#bk-msg").textContent = ok ? "Copied." : "Select the text and copy it yourself (Ctrl+C / ⌘C).";
    });
  });
  const clear = ids => ids.forEach(id => { const el = $(id); if (el) el.value = ""; });

  $("#f-pin").addEventListener("submit", async e => {
    e.preventDefault();
    const cur = state.recovery ? null : $("#p-cur").value, n1 = $("#p-new").value, n2 = $("#p-new2").value;
    if (!state.recovery) {
      const h = await hashPin(a.salt, cur);
      if (!isPin(cur) || (h !== a.pin && h !== a.backup)) return say("#p-msg", "Your current PIN or backup PIN isn't right.");
    }
    if (!isPin(n1)) return say("#p-msg", "The new PIN must be 4 to 8 digits.");
    if (n1 !== n2) return say("#p-msg", "The two new PINs don't match.");
    const h1 = await hashPin(a.salt, n1);
    if (h1 === a.backup) return say("#p-msg", "Your PIN must be different from your backup PIN.");
    a.pin = h1; persistAccount(a);
    const wasRecovery = state.recovery; state.recovery = false;
    if (wasRecovery) { renderAccount(); say("#p-msg", "New PIN saved. Use it next time you sign in.", true); return; }
    clear(["#p-cur", "#p-new", "#p-new2"]); say("#p-msg", "PIN changed.", true);
  });

  $("#f-bak").addEventListener("submit", async e => {
    e.preventDefault();
    const cur = $("#b-cur").value, n1 = $("#b-new").value, n2 = $("#b-new2").value;
    if (!isPin(cur) || (await hashPin(a.salt, cur)) !== a.pin) return say("#b-msg", "Your current PIN isn't right.");
    if (!isPin(n1)) return say("#b-msg", "The backup PIN must be 4 to 8 digits.");
    if (n1 !== n2) return say("#b-msg", "The two backup PINs don't match.");
    if (n1 === cur) return say("#b-msg", "Your backup PIN must be different from your PIN.");
    a.backup = await hashPin(a.salt, n1); persistAccount(a);
    clear(["#b-cur", "#b-new", "#b-new2"]); say("#b-msg", "Backup PIN changed.", true);
  });

  $("#f-name").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#n-name").value.trim().replace(/\s+/g, " ");
    const col = (view.querySelector('input[name="n-color"]:checked') || {}).value || a.color;
    if (!name) return say("#n-msg", "Enter a name.");
    if (state.accounts.some(x => x.id !== a.id && x.name.toLowerCase() === name.toLowerCase())) return say("#n-msg", `There's already a player called ${name}.`);
    a.name = name; a.color = col; persistAccount(a);
    renderHeader(); renderAccount(); say("#n-msg", "Saved.", true);
  });

  $("#f-del").addEventListener("submit", async e => {
    e.preventDefault();
    const pin = $("#d-pin").value;
    if (!isPin(pin) || (await hashPin(a.salt, pin)) !== a.pin) return say("#d-msg", "That PIN isn't right.");
    say("#d-msg", "");
    const box = $("#d-actions");
    box.innerHTML = `<button class="btn ghost" type="button" id="d-keep">Keep ${esc(a.name)}</button><button class="btn warn" type="button" id="d-go">Delete for good</button>`;
    $("#d-keep").addEventListener("click", renderAccount);
    $("#d-go").addEventListener("click", async () => {
      $("#d-go").disabled = true;
      const ids = myGames().map(g => g.id);
      state.games = state.games.filter(g => g.acct !== a.id);
      state.accounts = state.accounts.filter(x => x.id !== a.id);
      writeLocal();
      for (const id of ids) await cloudDel(id);
      await cloudDel("acct-" + a.id);
      signOut();
    });
  });
}

/* --------------------------------------------------------------- game list */
function stageCards(a) {
  const p = stage2Progress(a.id), open = stage2Open(a.id), open3 = stage3Open(a.id);
  const meter = (label, have, need) => `<div class="meter"><div class="meter-row"><span>${label}</span><span class="num">${Math.min(have, need)}/${need}</span></div>
    <div class="bar"><i style="transform:scaleX(${Math.min(1, have / need)})"></i></div></div>`;
  return `<div class="stages" role="group" aria-label="Brainstack level">
    <button class="stage" data-stage="1" aria-pressed="${state.stage === 1}">
      <div class="stage-top"><span class="stage-n">${STAGE_NAME[1]}</span>${p.levels >= TOTAL_LEVELS ? `<span class="chip good">Complete</span>` : ""}</div>
      <small>${p.levels}/${TOTAL_LEVELS} levels cleared · normal points</small>
    </button>
    <button class="stage" data-stage="2" aria-pressed="${state.stage === 2}" ${open ? "" : "disabled"}>
      <div class="stage-top"><span class="stage-n">${STAGE_NAME[2]}</span><span class="chip ${open ? "accent" : "lock"}" style="--mc:var(--accent)">${open ? "×1.5 points" : "Locked"}</span></div>
      ${open ? `<small>${clearedCountOf(a.id, 2)}/${TOTAL_LEVELS} levels cleared · 35 new levels, harder questions</small>`
        : `<small>Unlocks when you clear every level and play ${STAGE2_GAMES} games.</small>${meter("Levels cleared", p.levels, TOTAL_LEVELS)}${meter("Games played", p.games, STAGE2_GAMES)}`}
    </button>
    <button class="stage s3" data-stage="3" aria-pressed="${state.stage === 3}" ${open3 ? "" : "disabled"}>
      <div class="stage-top"><span class="stage-n">${STAGE_NAME[3]}</span><span class="chip ${open3 ? "gold" : "lock"}">${open3 ? "×3 points" : "Locked"}</span></div>
      ${open3 ? `<small>${clearedCountOf(a.id, 3)}/${LEVELS3} levels cleared · Olympiad, Calculus, Science, Remix</small>`
        : `<small>Unlocks when you clear all ${TOTAL_LEVELS} Brainstack Level 2 levels.</small>${meter("Level 2 levels cleared", clearedCountOf(a.id, 2), TOTAL_LEVELS)}`}
    </button>
  </div>`;
}

function renderHome() {
  const a = me();
  if (!stageOpen(a.id, state.stage)) setStage(1);
  const stage = state.stage;
  if (stage === 2 && !a.seen2) { a.seen2 = true; persistAccount(a); }
  if (stage === 3 && !a.seen3) { a.seen3 = true; persistAccount(a); }
  const celebrate3 = stage !== 3 && stage3Open(a.id) && !a.seen3;
  const celebrate = !celebrate3 && stage === 1 && stage2Open(a.id) && !a.seen2;
  const cards = modesFor(stage).map(m => {
    const u = unlockedOf(m.id);
    const cleared = [1, 2, 3, 4, 5].filter(l => clearedFor(m.id, l)).length;
    const pips = Array.from({ length: LEVELS }, (_, k) => {
      const l = k + 1; const cls = clearedFor(m.id, l) ? "done" : (l <= u ? "open" : "");
      return `<span class="pip ${cls}"></span>`;
    }).join("");
    const played = myGames().filter(g => g.mode === m.id && stageOf(g) === stage).length;
    return `<button class="mode" style="--mc:var(${m.color})" data-mode="${m.id}">
      ${(m.fresh && stage === 1) || (m.fresh3 && stage === 3) ? `<span class="chip accent new-tag">New</span>` : ""}
      <div class="mode-row"><span class="glyph" aria-hidden="true">${m.glyph}</span>
        <div><h3>${m.name}</h3><p>${m.blurb}</p></div></div>
      <div class="pips" aria-label="${cleared} of ${LEVELS} levels cleared">${pips}</div>
      <div class="mode-meta"><span>${cleared}/${LEVELS} levels cleared</span><span>${played} game${played === 1 ? "" : "s"} played</span></div>
    </button>`;
  }).join("");
  view.innerHTML = `<section style="display:grid;gap:14px">
    ${celebrate ? `<div class="unlock"><span class="label" style="color:inherit;opacity:.8">Unlocked</span>
      <h2>Brainstack Level 2 is open</h2>
      <p>You cleared all ${TOTAL_LEVELS} levels and played ${gamesOf(a.id).length} games. Level 2 has the same seven games with 35 new levels of harder questions, and every answer is worth 1.5× the points.</p>
      <button class="btn" id="go-stage2">Start Brainstack Level 2 →</button></div>` : ""}
    ${celebrate3 ? `<div class="unlock l3"><span class="label" style="color:inherit;opacity:.8">Unlocked</span>
      <h2>Brainstack Level 3 is open</h2>
      <p>You cleared all ${TOTAL_LEVELS * 2} levels of Brainstack Levels 1 and 2. Level 3 has four tougher sections (Olympiad Math, Calculus, Science and a Remix of earlier levels), and every answer is worth triple points.</p>
      <button class="btn" id="go-stage3">Start Brainstack Level 3 →</button></div>` : ""}
    ${stageCards(a)}
    ${thoughtCard(dayIndex())}
    <div class="section-head"><h2>Hi ${esc(a.name)}, choose a game</h2><p>${STAGE_NAME[stage]} · clear a level with ${PASS} of ${PER_ROUND} correct to unlock the next.</p></div>
    <div class="modes">${cards}</div>
    <div class="rules"><b>Scoring.</b> Each correct answer earns 100 points plus up to 100 for speed, multiplied by the level (×1.0 at Level 1 up to ×2.0 at Level 5)${stage > 1 ? `, then by ${STAGE_MULT[stage]} in ${STAGE_NAME[stage]}` : ""}. Untimed levels give a flat 50 bonus instead of the speed bonus. Three or more correct in a row adds a streak bonus. Running out of time counts as a miss.${stage === 3 ? " <b>50:50 lifeline.</b> Once per round you can remove two wrong answers; that question then scores half." : ""}</div>
  </section>`;
  view.querySelectorAll("[data-stage]").forEach(b => b.addEventListener("click", () => { setStage(Number(b.dataset.stage)); renderHome(); }));
  if (celebrate) $("#go-stage2").addEventListener("click", () => { setStage(2); renderHome(); window.scrollTo({ top: 0 }); });
  if (celebrate3) $("#go-stage3").addEventListener("click", () => { setStage(3); renderHome(); window.scrollTo({ top: 0 }); });
  wireThought();
  view.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => go({ name: "levels", mode: b.dataset.mode })));
}

function renderLevels(modeId) {
  const m = modeById(modeId);
  const u = unlockedOf(modeId);
  const cards = Array.from({ length: LEVELS }, (_, k) => {
    const l = k + 1, locked = l > u, cleared = clearedFor(modeId, l), best = bestFor(modeId, l), t = timeFor(modeId, l, state.stage);
    const chip = locked ? `<span class="chip lock">Locked</span>` : cleared ? `<span class="chip good">Cleared</span>` : `<span class="chip open">Open</span>`;
    return `<button class="level" data-level="${l}" ${locked ? "disabled" : ""}>
      <span class="label">Level</span><span class="lv">${l}</span>
      <span class="lname">${LEVEL_NAMES[k]}</span>${chip}
      <small>${t ? t + " s per question" : "No timer"} · ×${((1 + k * 0.25) * STAGE_MULT[state.stage]).toFixed(2)}</small>
      <small>Best: <span class="num">${best ? fmt(best) : "—"}</span></small>
    </button>`;
  }).join("");
  const notes = {
    olympiad: "Puzzle questions in the style of maths olympiads, kept friendly for the clock. Level 5 has no timer, so take your time and think it through.",
    science: "Levels 1 to 4 cover everyday science. Level 5 is trick questions: read carefully, the answer is easier than it looks.",
    math: "Math Sprint builds new sums every time you play, and each level uses harder operations.",
  };
  if (state.stage === 2) notes.math = "Brainstack Level 2 sums: bigger multiplications, squares and cubes, fractions and percentages. New sums every time.";
  if (state.stage === 3) Object.assign(notes, {
    olympiad: "Contest-style problems: remainders, divisors, counting and clever algebra. Keep paper nearby. Level 5 has no timer.",
    calculus: "Levels 1 and 2 are the basic rules, Levels 3 and 4 add the product and chain rules and definite integrals, and Level 5 (no timer) brings integration by parts and famous limits.",
    science: "Physics, chemistry and biology with real numbers and units. Level 5 is about ideas that sound right but aren't.",
    remix: "Six questions from six different games of Brainstack Levels 1 and 2, at this level's difficulty, on a faster clock. Word scrambles get 10 extra seconds. New mix every time.",
  });
  view.innerHTML = `<section style="display:grid;gap:14px;--mc:var(${m.color})">
    <button class="back" id="back">← All games</button>
    <div class="mode-row"><span class="glyph" aria-hidden="true">${m.glyph}</span>
      <div><span class="label">${STAGE_NAME[state.stage]}</span><h2>${m.name}</h2><p class="hint" style="margin:0">${m.blurb}</p></div></div>
    <div class="levels">${cards}</div>
    <div class="rules">${notes[modeId] || "Each level has its own set of " + PER_ROUND + " questions, so moving up always means new material. The timer gets shorter as you climb."}</div>
  </section>`;
  $("#back").addEventListener("click", () => go({ name: "home" }));
  view.querySelectorAll("[data-level]").forEach(b => b.addEventListener("click", () => startGame(modeId, Number(b.dataset.level))));
}

/* -------------------------------------------------------------------- game */
function startGame(mode, level) {
  const stage = state.stage;
  game = { mode, level, stage, qs: buildRound(mode, level, stage), i: 0, points: 0, correct: 0, streak: 0, bestStreak: 0,
           limit: timeFor(mode, level, stage), left: 0, locked: false, results: [], fifty: stage === 3 ? 1 : 0, fiftyAt: -1 };
  screen = { name: "game" };
  renderHeader();
  renderQuestion();
}

function quitGame() { clearInterval(tick); tick = null; game = null; }

function renderQuestion() {
  const m = modeById(game.mode, game.stage), q = game.qs[game.i];
  const kind = q.kind || m.kind;
  game.qlimit = game.limit && kind === "type" && game.mode === "remix" ? game.limit + 10 : game.limit;
  const timed = game.qlimit > 0;
  const prog = game.qs.map((_, k) => {
    const r = game.results[k];
    return `<span class="${r ? (r.ok ? "ok" : "no") : (k === game.i ? "now" : "")}"></span>`;
  }).join("");
  let body;
  if (kind === "type") {
    body = `<div class="tiles" aria-label="Scrambled letters">${q.letters.split("").map(c => `<span class="tile">${c}</span>`).join("")}</div>
      <div class="hint">Hint: ${esc(q.hint)} · ${q.answer.length} letters</div>
      <form class="typed" id="type-form" autocomplete="off">
        <input id="type-input" aria-label="Your answer" maxlength="${q.answer.length + 4}" autocapitalize="characters" spellcheck="false">
        <button class="btn" type="submit">Submit</button>
      </form>`;
  } else {
    body = `<div class="answers">${q.options.map((o, k) => `<button class="ans" data-opt="${esc(o)}"><span class="key">${kind === "tf" ? o[0] : k + 1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
  }
  view.innerHTML = `<section class="game" style="--mc:var(${m.color})">
    <div class="hud">
      <div class="stat"><span class="label">${bsTag(game.stage)}${esc(m.name)}</span><span class="num">Level ${game.level}</span></div>
      <div class="stat"><span class="label">Question</span><span class="num">${game.i + 1}/${game.qs.length}</span></div>
      <div class="stat"><span class="label">Points</span><span class="num" id="pts">${fmt(game.points)}</span></div>
      <div class="stat"><span class="label">Streak</span><span class="num">${game.streak}${game.streak >= 3 ? " 🔥" : ""}</span></div>
    </div>
    <div class="progress" aria-hidden="true">${prog}</div>
    <div class="timer">
      <div class="timer-top"><span class="label">${timed ? "Time left" : "No time limit"}</span><span class="num" id="t-num">${timed ? game.qlimit + "s" : "∞"}</span></div>
      <div class="bar ${timed ? "" : "calm"}"><i id="t-bar"></i></div>
    </div>
    ${q.tag ? `<div class="qtag">From ${esc(q.tag)}</div>` : ""}
    <div class="question">${kind === "type" ? "Unscramble this word" : esc(q.q)}</div>
    ${body}
    <div class="feedback" id="feedback" aria-live="polite"></div>
    <div class="game-foot">
      <div class="foot-left"><button class="btn ghost" id="quit">Quit round</button>
        ${game.stage === 3 && kind === "mc" && q.options.length === 4 ? `<button class="btn ghost" id="fifty" ${game.fifty ? "" : "disabled"}>${game.fifty ? "50:50 lifeline" : "50:50 used"}</button>` : ""}</div>
      <button class="btn" id="next" hidden>${game.i + 1 < game.qs.length ? "Next question →" : "See results →"}</button>
    </div>
  </section>`;

  $("#quit").addEventListener("click", () => { const mode = game.mode; quitGame(); go({ name: "levels", mode }); });
  $("#next").addEventListener("click", advance);
  const fifty = $("#fifty");
  if (fifty) fifty.addEventListener("click", () => {
    if (!game || game.locked || !game.fifty) return;
    game.fifty = 0; game.fiftyAt = game.i;
    shuffle([...view.querySelectorAll(".ans")].filter(b => b.dataset.opt !== q.answer)).slice(0, 2)
      .forEach(b => { b.disabled = true; b.classList.add("gone"); });
    fifty.disabled = true; fifty.textContent = "50:50 used";
  });
  if (kind === "type") {
    $("#type-form").addEventListener("submit", e => { e.preventDefault(); const v = $("#type-input").value.trim().toUpperCase(); if (v) answer(v); });
    $("#type-input").focus();
  } else {
    view.querySelectorAll(".ans").forEach(b => b.addEventListener("click", () => answer(b.dataset.opt)));
  }

  game.locked = false;
  game.started = performance.now();
  game.left = game.qlimit;
  clearInterval(tick);
  if (timed) { tick = setInterval(updateTimer, 100); updateTimer(); }
}

function updateTimer() {
  if (!game || game.locked || !game.qlimit) return;
  const elapsed = (performance.now() - game.started) / 1000;
  game.left = Math.max(0, game.qlimit - elapsed);
  const frac = game.left / game.qlimit, low = game.left <= 5;
  const n = $("#t-num"), bar = $("#t-bar");
  if (n) { n.textContent = Math.ceil(game.left) + "s"; n.classList.toggle("low", low); }
  if (bar) { bar.style.transform = `scaleX(${frac})`; bar.classList.toggle("low", low); }
  if (game.left <= 0) answer(null);
}

function answer(choice) {
  if (!game || game.locked) return;
  game.locked = true;
  clearInterval(tick);
  const m = modeById(game.mode, game.stage), q = game.qs[game.i];
  const kind = q.kind || m.kind;
  const ok = choice !== null && choice === q.answer;
  let gained = 0;
  if (ok) {
    game.correct++; game.streak++; game.bestStreak = Math.max(game.bestStreak, game.streak);
    const mult = (1 + (game.level - 1) * 0.25) * STAGE_MULT[game.stage];
    const speed = game.qlimit ? Math.round((game.left / game.qlimit) * 100) : 50;
    const streakBonus = game.streak >= 3 ? 25 * (game.streak - 2) : 0;
    gained = Math.round((100 + speed) * mult) + streakBonus;
    if (game.fiftyAt === game.i) gained = Math.round(gained / 2);
    game.points += gained;
  } else {
    game.streak = 0;
  }
  game.results[game.i] = { ok, q: kind === "type" ? `${q.letters} → ${q.answer}` : q.q, answer: q.answer, choice, gained, timeout: choice === null };

  if (kind === "type") {
    const inp = $("#type-input"); inp.disabled = true; inp.classList.add(ok ? "correct" : "wrong");
    view.querySelector("#type-form .btn").disabled = true;
  } else {
    view.querySelectorAll(".ans").forEach(b => {
      b.disabled = true;
      if (b.dataset.opt === q.answer) b.classList.add("correct");
      else if (b.dataset.opt === choice) b.classList.add("wrong");
    });
  }
  const fiftyBtn = $("#fifty"); if (fiftyBtn) fiftyBtn.disabled = true;
  const msg = ok ? `<span class="good gain">Correct! +${fmt(gained)}</span>${game.streak >= 3 ? ` <span class="combo">${game.streak} in a row!</span>` : ""}`
    : choice === null ? `<span class="bad">Time's up. The answer was ${esc(q.answer)}.</span>`
    : `<span class="bad">Not quite. The answer was ${esc(q.answer)}.</span>`;
  $("#feedback").innerHTML = msg + (q.note ? `<span class="note">${esc(q.note)}</span>` : "")
    + (!ok && game.stage === 3 ? `<span class="cheer">${esc(CHEERS[rnd(0, CHEERS.length - 1)])}</span>` : "");
  $("#pts").textContent = fmt(game.points);
  const next = $("#next"); next.hidden = false; next.focus();
}

function advance() {
  if (!game) return;
  game.i++;
  if (game.i < game.qs.length) renderQuestion();
  else finishGame();
}

function finishGame() {
  clearInterval(tick);
  const g = game; game = null;
  const a = me();
  const passed = g.correct >= PASS;
  const key = unlockKey(g.stage);
  if (!a[key]) a[key] = freshUnlocked(g.stage);
  let newUnlock = false;
  if (passed && g.level === (a[key][g.mode] || 1) && g.level < LEVELS) { a[key][g.mode] = g.level + 1; newUnlock = true; }
  const rec = { id: "g-" + Date.now().toString(36) + randId(4), ts: Date.now(), acct: a.id,
    mode: g.mode, level: g.level, correct: g.correct, total: g.qs.length, points: g.points, passed, bestStreak: g.bestStreak };
  if (g.stage > 1) rec.stage = g.stage;
  const wasOpen = stage2Open(a.id), was3 = stage3Open(a.id);
  state.games.unshift(rec);
  const stage2New = !wasOpen && stage2Open(a.id);
  const stage3New = !was3 && stage3Open(a.id);
  a.lastUsed = Date.now();
  persistGame(rec);
  persistAccount(a);
  go({ name: "result", rec, recap: g.results, newUnlock, stage2New, stage3New });
}

function renderResult(rec, recap, newUnlock, stage2New, stage3New) {
  const m = modeById(rec.mode, stageOf(rec));
  const same = myGames().filter(g => inStage(g, rec.mode, rec.level, stageOf(rec)));
  const isBest = rec.points > 0 && same.length > 1 && same.every(g => g.id === rec.id || g.points < rec.points);
  const headline = rec.passed ? (rec.correct === rec.total ? "Perfect round" : "Level cleared") : "Not this time";
  const sub = rec.passed
    ? (newUnlock ? `Level ${rec.level + 1} is now open, with a new set of questions.` : rec.level === LEVELS ? "You've cleared the top level of this game." : "Nice work. Keep pushing your best score.")
    : `You need ${PASS} correct to clear this level. You got ${rec.correct}.`;
  const items = recap.map(r => `<li><span class="mark ${r.ok ? "ok" : "no"}">${r.ok ? "✓" : "✗"}</span>
      <span class="q">${esc(r.q)}<small>${r.ok ? "Answered " + esc(r.answer) : (r.timeout ? "Timed out" : "You said " + esc(r.choice)) + " · answer: " + esc(r.answer)}</small></span>
      <b class="num">${r.ok ? "+" + fmt(r.gained) : "0"}</b></li>`).join("");
  const canNext = rec.passed && rec.level < LEVELS;
  view.innerHTML = `${stage2New ? `<div class="unlock" style="margin-bottom:16px"><span class="label" style="color:inherit;opacity:.8">Unlocked</span>
      <h2>Brainstack Level 2 is open</h2>
      <p>You've cleared all ${TOTAL_LEVELS} levels and played ${gamesOf(rec.acct).length} games. Seven games, 35 new levels, 1.5× points.</p>
      <button class="btn" id="go-stage2">Go to Brainstack Level 2 →</button></div>` : ""}
  ${stage3New ? `<div class="unlock l3" style="margin-bottom:16px"><span class="label" style="color:inherit;opacity:.8">Unlocked</span>
      <h2>Brainstack Level 3 is open</h2>
      <p>Every Level 2 level is cleared. Four tougher sections (Olympiad Math, Calculus, Science, Remix) and triple points are waiting.</p>
      <button class="btn" id="go-stage3">Go to Brainstack Level 3 →</button></div>` : ""}
  <section class="game result" style="--mc:var(${m.color})">
    <span class="chip ${rec.passed ? "good" : "bad"}">${bsTag(stageOf(rec))}${esc(m.name)} · Level ${rec.level}</span>
    <h2 style="font-size:30px">${headline}</h2>
    <p class="hint" style="margin:0">${sub}</p>
    <div><span class="big num" style="color:var(--mc)">${fmt(rec.points)}</span><div class="label" style="margin-top:6px">points${isBest ? " · new best for this level" : ""}</div></div>
    <div class="result-stats">
      <div><span class="label">Correct</span><span class="num">${rec.correct}/${rec.total}</span></div>
      <div><span class="label">Best streak</span><span class="num">${rec.bestStreak}</span></div>
      <div><span class="label">Your total</span><span class="num">${fmt(pointsOf(state.active))}</span></div>
    </div>
    <ul class="recap">${items}</ul>
    <div class="actions">
      ${canNext ? `<button class="btn" id="r-next">Play Level ${rec.level + 1} →</button>` : ""}
      <button class="btn ${canNext ? "ghost" : ""}" id="r-retry">${rec.mode === "math" ? "Play again (new sums)" : rec.mode === "remix" ? "Play again (new mix)" : "Retry level"}</button>
      <button class="btn ghost" id="r-levels">Choose level</button>
      <button class="btn ghost" id="r-records">View records</button>
    </div>
    ${thoughtCard(rnd(0, THOUGHTS.length - 1), rec.passed ? "Thought to keep you climbing" : "Thought for the next try")}
  </section>`;
  wireThought();
  if (rec.correct === rec.total || stage2New || stage3New) confetti();
  if (canNext) $("#r-next").addEventListener("click", () => startGame(rec.mode, rec.level + 1));
  $("#r-retry").addEventListener("click", () => startGame(rec.mode, rec.level));
  $("#r-levels").addEventListener("click", () => go({ name: "levels", mode: rec.mode }));
  $("#r-records").addEventListener("click", () => go({ name: "records" }));
  if (stage2New) $("#go-stage2").addEventListener("click", () => { const a = me(); a.seen2 = true; persistAccount(a); setStage(2); go({ name: "home" }); });
  if (stage3New) $("#go-stage3").addEventListener("click", () => { const a = me(); a.seen3 = true; persistAccount(a); setStage(3); go({ name: "home" }); });
  (stage3New ? $("#go-stage3") : stage2New ? $("#go-stage2") : canNext ? $("#r-next") : $("#r-retry")).focus();
}

/* ----------------------------------------------------------------- records */
function renderRecords() {
  const a = me();
  const games = myGames();
  const played = games.length;
  const answered = games.reduce((s, g) => s + g.total, 0);
  const right = games.reduce((s, g) => s + g.correct, 0);
  const acc = answered ? Math.round(right / answered * 100) : 0;
  const open2 = stage2Open(a.id), open3 = stage3Open(a.id), bestStage = stageOpen(a.id, state.stage) ? state.stage : 1;
  const bests = modesFor(bestStage).map(m => {
    const mg = games.filter(g => g.mode === m.id && stageOf(g) === bestStage);
    const top = mg.reduce((b, g) => (!b || g.points > b.points ? g : b), null);
    const pts = mg.reduce((s, g) => s + g.points, 0);
    return `<div class="mb" style="--mc:var(${m.color})"><b>${m.name}</b>
      <span class="num">${top ? fmt(top.points) : "—"}</span>
      <small>${top ? "Best round, Level " + top.level : "Not played yet"}</small>
      <small>${mg.length} game${mg.length === 1 ? "" : "s"} · ${fmt(pts)} pts total</small></div>`;
  }).join("");
  const rows = games.slice(0, 100).map(g => {
    const m = modeById(g.mode, stageOf(g)); const d = new Date(g.ts);
    return `<tr><td>${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} <span class="hint">${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></td>
      <td><span class="mdot" style="--mc:var(${m.color})"></span>${m.name}</td>
      <td class="num">${bsTag(stageOf(g))}L${g.level}</td>
      <td class="num r">${g.correct}/${g.total}</td>
      <td class="num r">${fmt(g.points)}</td>
      <td><span class="chip ${g.passed ? "good" : "bad"}">${g.passed ? "Cleared" : "Missed"}</span></td></tr>`;
  }).join("");
  const board = state.accounts.map(p => ({ p, pts: pointsOf(p.id), n: gamesOf(p.id).length, lv: clearedCountOf(p.id), lv2: stage2Open(p.id) ? clearedCountOf(p.id, 2) : null, lv3: stage3Open(p.id) ? clearedCountOf(p.id, 3) : null }))
    .sort((x, y) => y.pts - x.pts)
    .map((r, i) => `<tr class="${r.p.id === a.id ? "me" : ""}"><td class="num">${i + 1}</td>
      <td><span class="cell-player">${avatar(r.p)}${esc(r.p.name)}${r.p.id === a.id ? ' <span class="hint">(you)</span>' : ""}</span></td>
      <td class="num r">${fmt(r.pts)}</td><td class="num r">${r.n}</td><td class="num r">${r.lv}/${TOTAL_LEVELS}</td><td class="num r">${r.lv2 === null ? '<span class="hint">Locked</span>' : r.lv2 + "/" + TOTAL_LEVELS}</td><td class="num r">${r.lv3 === null ? '<span class="hint">Locked</span>' : r.lv3 + "/" + LEVELS3}</td></tr>`).join("");
  view.innerHTML = `<section style="display:grid;gap:16px">
    <div class="section-head"><h2>${esc(a.name)}'s records</h2><p>Every round you finish is logged here.</p></div>
    <div class="tiles-row">
      <div class="kpi"><span class="label">Total points</span><span class="num">${fmt(pointsOf(a.id))}</span><small>across all games</small></div>
      <div class="kpi"><span class="label">Games played</span><span class="num">${played}</span><small>${right} correct answers</small></div>
      <div class="kpi"><span class="label">Accuracy</span><span class="num">${answered ? acc + "%" : "—"}</span><small>${answered} questions answered</small></div>
      <div class="kpi"><span class="label">Levels cleared</span><span class="num">${clearedCountOf(a.id)}/${TOTAL_LEVELS}</span><small>${open2 ? "Level 2: " + clearedCountOf(a.id, 2) + "/" + TOTAL_LEVELS : "Level 2 locked"} · ${open3 ? "Level 3: " + clearedCountOf(a.id, 3) + "/" + LEVELS3 : "Level 3 locked"}</small></div>
    </div>
    <h3>Best by game${open2 ? " · " + STAGE_NAME[bestStage] : ""}</h3>
    <div class="mode-bests">${bests}</div>
    <h3>Game history</h3>
    <div class="table-wrap">${played ? `<table><thead><tr><th>When</th><th>Game</th><th>Level</th><th class="r">Correct</th><th class="r">Points</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">No games yet. Finished rounds appear here with their score, level and result.<br><br><button class="btn" id="go-play">Play your first game</button></div>`}</div>
    <h3>All players</h3>
    <div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th class="r">Points</th><th class="r">Games</th><th class="r">Level 1 cleared</th><th class="r">Level 2 cleared</th><th class="r">Level 3 cleared</th></tr></thead><tbody>${board}</tbody></table></div>
    ${played ? `<div class="danger" id="danger"><span>Start over with all of your levels locked again?</span><button class="btn ghost" id="reset">Reset my records</button></div>` : ""}
  </section>`;
  if (!played) $("#go-play").addEventListener("click", () => go({ name: "home" }));
  else $("#reset").addEventListener("click", () => {
    const box = $("#danger");
    box.innerHTML = `<span>This deletes your ${played} games and level progress.</span><button class="btn ghost" id="cancel">Keep records</button><button class="btn warn" id="confirm">Delete my records</button>`;
    $("#cancel").addEventListener("click", renderRecords);
    $("#confirm").addEventListener("click", async () => {
      $("#confirm").disabled = true;
      const ids = games.map(g => g.id);
      state.games = state.games.filter(g => g.acct !== a.id);
      a.unlocked = freshUnlocked();
      delete a.unlocked2; delete a.seen2; delete a.unlocked3; delete a.seen3;
      persistAccount(a);
      for (const id of ids) await cloudDel(id);
      renderRecords(); renderHeader();
    });
  });
}

/* ---------------------------------------------------------------- keyboard */
document.addEventListener("keydown", e => {
  if (screen.name === "pin") {
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinKey(e.key); }
    else if (e.key === "Backspace") { e.preventDefault(); pinKey("del"); }
    else if (e.key === "Enter") { e.preventDefault(); pinKey("ok"); }
    else if (e.key === "Escape") go({ name: "players" });
    return;
  }
  if (screen.name !== "game" || !game) return;
  if (e.target && e.target.tagName === "INPUT") return;
  const m = modeById(game.mode, game.stage), kind = game.qs[game.i].kind || m.kind;
  if (game.locked) { if (e.key === "Enter" && document.activeElement !== $("#next")) { e.preventDefault(); advance(); } return; }
  const btns = [...view.querySelectorAll(".ans")];
  let idx = -1;
  if (kind === "tf") { const k = e.key.toLowerCase(); if (k === "t" || k === "1") idx = 0; if (k === "f" || k === "2") idx = 1; }
  else if (/^[1-4]$/.test(e.key)) idx = Number(e.key) - 1;
  if (idx >= 0 && btns[idx]) { e.preventDefault(); btns[idx].click(); }
});

/* -------------------------------------------------------------------- boot */
readLocal();
// A saved copy can ship a progress file that sets window.BRAINSTACK_SEED; it is imported once.
try {
  if (window.BRAINSTACK_SEED && !localStorage.getItem("brainstack.seeded")) { importData(window.BRAINSTACK_SEED); localStorage.setItem("brainstack.seeded", "1"); }
} catch (e) { /* storage unavailable */ }
screen = me() ? { name: "home" } : { name: "players" };
render();
initCloud();
})();
