// Mock-up portraits for people in CALMS (staff and borrowers): friendly illustrated faces, drawn on the server from
// the person's name, so the same name always gets the same face. Style: "Avataaars" by Pablo Stanley, free for
// personal and commercial use (https://avataaars.com), drawn with the DiceBear library (MIT). No photos, no real people.
const { createAvatar } = require("@dicebear/core");
const { avataaars } = require("@dicebear/collection");

// whether a first name reads as a woman's, so the hair and beard fit (the usual Filipino names; anything else is
// decided by the name's ending, then by the name itself)
const WOMEN = new Set(["liza", "mila", "corazon", "regina", "maricar", "katrina", "lourdes", "rosalinda", "imelda", "teresita", "carmela", "josefina", "marivic",
  "norma", "herminia", "felisa", "emily", "maria", "ana", "grace", "joy", "rose", "luz", "carmen", "nenita", "lorna", "cristina", "elena", "jocelyn", "marites", "susan",
  "michelle", "angelica", "kristine", "princess", "divina", "ligaya", "remedios", "consuelo", "precious", "glenda", "irene", "evelyn", "marilyn", "rowena", "jennifer"]);
const MEN = new Set(["antonio", "aurelio", "benjie", "jun", "rodel", "paolo", "benigno", "vicente", "crisanto", "nestor", "ramon", "glenn", "juan", "jose", "luca", "joshua", "noel", "andrea"]);
function isWoman(name) {
  const first = String(name || "").replace(/^(ladder|atty\.?|dr\.?|engr\.?)\s+/i, "").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-zñ]/g, "");
  if (WOMEN.has(first)) return true; if (MEN.has(first)) return false;
  return /(a|ita|ine|elle|ette|ie)$/.test(first) && !/(io|o)$/.test(first);
}
const SHE = ["bob", "bun", "curly", "curvy", "longButNotTooLong", "miaWallace", "straight01", "straight02", "straightAndStrand", "bigHair"];
const HE = ["shortCurly", "shortFlat", "shortRound", "shortWaved", "sides", "theCaesar", "theCaesarAndSidePart"];
const kept = new Map();
function face(name, kind) {
  const key = name + "|" + kind; if (kept.has(key)) return kept.get(key);
  const she = isWoman(name), staff = kind === "staff";
  const svg = createAvatar(avataaars, {
    seed: name, radius: 50,
    top: she ? SHE : HE, topProbability: 100,
    facialHair: ["beardLight", "beardMedium", "moustacheFancy"], facialHairProbability: she ? 0 : 25,
    hairColor: ["2c1b18", "4a312c", "724133", "a55728"],
    skinColor: ["edb98a", "d08b5b", "ae5d29", "ffdbb4"],
    eyes: ["default", "happy", "side", "squint"], eyebrows: ["default", "defaultNatural", "raisedExcitedNatural", "flatNatural"],
    mouth: ["smile", "default", "twinkle", "serious"],
    accessories: ["prescription01", "prescription02", "round"], accessoriesProbability: 18,
    clothing: staff ? ["blazerAndShirt", "blazerAndSweater", "collarAndSweater"] : ["shirtCrewNeck", "shirtScoopNeck", "shirtVNeck", "collarAndSweater", "hoodie", "blazerAndShirt"],
    clothesColor: ["7e221c", "3c4f5c", "65c9ff", "5199e4", "25557c", "929598", "a7ffc4", "ffafb9", "ffffb1", "e6e6e6"],
    backgroundColor: staff ? ["f3d9b1", "f6e3c9", "efd0c2"] : ["e9ded3", "f1e3d3", "e3e9e4", "e6e1ef", "f4e4dc"], backgroundType: ["solid"],
  }).toString();
  if (kept.size > 2000) kept.clear(); kept.set(key, svg); return svg;
}
module.exports = { face, isWoman };
