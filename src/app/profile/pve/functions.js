import { LegacyClient } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 * @param {number} score
 */
export function matchResultValue(score) {
   const target = 600000;
   // Use a sliding scale
   const diff = score - target;
   // Above 900k and below 300k are capped with this scaling factor
   const scaledDiff = diff / 600000;
   // "tie" should move from 0 to 0.5
   const centeredDiff = scaledDiff + 0.5;
   // Clamp between [0, 1]
   const matchScore = Math.max(0, Math.min(1, centeredDiff));
   return matchScore;
}

/**
 * @param {import("osu-web.js").Mod[]} lobbyMods 
 * @param {import("osu-web.js").Mod[]} scoreMods 
 */
function parseSongMods(lobbyMods, scoreMods) {
   // When freemod is set on DT, DT will be in both arrays
   // Just take unique mods in general
   const mods = [
      ...new Set(
         lobbyMods
            .concat(scoreMods)
            // Ignore NF
            .filter(m => m !== "NF")
      )
   ];

   // In order for the score to be valid, only one mod should be used
   if (mods.length > 1) return null;
   if (mods.length === 0) return "nm";
   else
      switch (mods[0]) {
         case "HD":
            return "hd";
         case "HR":
            return "hr";
         case "DT":
         case "NC":
            return "dt";
      }
}

/**
 * @param {string} link
 * @param {string} token
 */
export async function parseMpLobby(link) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = parseInt(link.slice(link.lastIndexOf("/") + 1));
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      console.log(mpLobby.games.length);
      /**
       * @type {{
       *    [key: string]: {
       *       map: number;
       *       mod: 'nm'|'hd'|'hr'|'dt';
       *       score: number;
       *    }[]
       * }}
       */
      const results = mpLobby.games.reduce((scoreAgg, game) => {
         if (game.end_time && game.team_type === "Head To Head")
            game.scores.forEach(score => {
               const scoreResult = {
                  map: game.beatmap_id,
                  mod: parseSongMods(game.mods, score.enabled_mods),
                  score:
                     game.scoring_type === "Score V2"
                        ? score.score
                        : debugCalcv1Score(score, game.beatmap_id)
               };
               if (scoreResult.mod && scoreResult.score) {
                  if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                  scoreAgg[score.user_id].push(scoreResult);
               }
            });
         return scoreAgg;
      }, {});
      return { results, mp: matchIdSegment };
   } catch (err) {
      console.error(err);
   }
}

/**
 * @param {import("osu-web.js").LegacyMatchScore} scoreInfo
 */
function debugCalcv1Score(scoreInfo, mapId) {
   const scoreListing = {
      // toby fox - Ruins
      4379302: 89398,
      4489231: 232484,
      4379306: 798948,
      4426619: 1327086,
      4403950: 2101504,
      4390315: 2175972,
      4379303: 2826178,
      // Yuki Kira - Yukihanasou
      3930724: 710794,
      3875530: 2384846,
      3942495: 3542436,
      4230454: 5411770,
      3913087: 9058660,
      3851001: 11557930,
      // CHiCO with HoneyWorks - Pride Kakumei (TV Size)
      778763: 345476,
      735028: 1260614,
      736184: 3621658,
      735677: 4635984,
      756104: 5469826,
      734877: 7847550,
      // Pendulum - Immunize (feat. Liam Howlett) (Cut Ver.)
      4416947: 1170912,
      4416946: 3208730,
      4416948: 9454876,
      4416950: 12596684,
      4416949: 14945846,
      4417342: 20410390,
      // Jodeci - Freek'n You (TV Size)
      3999483: 577152,
      3707175: 1432890,
      4863666: 2368554,
      3967429: 2575518,
      // Taylor Swift - New Romantics (Taylor's Version)
      4446325: 1164198,
      4378623: 5540278,
      4683679: 12037424,
      4670568: 21480818,
      4688986: 23692228,
      4363959: 23906032,
      // Catgirl feat. Log Off Now - Log Off Now Beatboxing (Deluxe Edition)
      4857774: 406520,
      4857969: 1204686,
      4858842: 1466658,
      4850878: 2396164,
      // Set It Off - Partners In Crime (Cut Ver.)
      4858830: 1061144,
      4791204: 2557574,
      4800844: 3260542,
      4813342: 3585308,
      4800843: 4485962,
      4791045: 3547436,
      4790335: 5812590,
      4790336: 6317780,
      // Kawano Marina - Sono Koe o Oboeteru
      330369: 8335338,
      4858539: 19857488,
      322394: 30149844,
      // Set It Off - Punching Bag (Cut Ver.)
      4087276: 815394,
      4087247: 1098804,
      4086900: 1342134,
      4076905: 1413666,
      // fhana - Eien to lu Hikari (Game Ver.)
      4453365: 2195178,
      4729274: 9364350,
      4799137: 9075904,
      4839682: 9202510,
      4715947: 9153802,
      // Makina - Pluton
      4766682: 2003484,
      4766680: 5197560,
      4766681: 11483148,
      4766679: 16997040,
      // inabakumori - Float Play
      4454529: 18579918,
      4844613: 24995376,
      4789350: 21524136,
      4299731: 24603734,
      4153296: 32068360,
      // Primary - Awake
      828823: 12407748,
      794859: 18593314,
      4809935: 19192550,
      763470: 23366782,
      4827228: 29738594,
      763469: 41376020,
      // Tamura Yukari - 14-Byou-go ni KISS Shite <3
      4722577: 33110832,
      1489935: 45238370,
      // Derevyannyye kity - Pole chudes
      3958889: 21499398,
      // B Komachi Ai (CV: Takahashi Rie) - Sign wa B (Ai Solo Ver.) (TV Size)
      4424633: 1322636,
      4454497: 3567210,
      4410671: 4105014,
      4718266: 4437308,
      4451207: 7995650,
      // they are gutting a body of water - texas instruments
      4517542: 1889606,
      4638286: 2293076,
      4516599: 3132638,
      4517845: 4302112,
      4477454: 6297840,
      // DJ ui_nyan - Shikairo Still Waiting
      4736379: 870834,
      4736727: 2305868,
      4736728: 3758516,
      4750676: 4843990,
      4734882: 5097590,
      // Koga Koharu (CV: Yuri Komori) - Yorimichi Little Star Koga Koharu Solo Remix
      4851398: 33426092,
      4847470: 43933458
   };

   if (!(mapId in scoreListing)) return;
   const acc =
      (scoreInfo.count50 / 6 + scoreInfo.count100 / 3 + scoreInfo.count300) /
      (scoreInfo.count50 + scoreInfo.count100 + scoreInfo.count300);
   const score =
      (700000 * scoreInfo.score * (scoreInfo.enabled_mods.includes("NF") + 1)) /
         acc /
         scoreListing[mapId] +
      300000 * Math.pow(acc, 10);
   return parseInt(score.toFixed());
}
