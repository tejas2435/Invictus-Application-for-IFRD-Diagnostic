const fs = require('fs');

const lines = fs.readFileSync('../docx_content.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l.length > 0);

let questionnaire = [];
let currentPart = null;
let currentSectionInfo = "";
let state = "SEARCH"; // SEARCH, IN_PART, IN_DOMAIN
let questionOptions = null;
let currentQuestion = null;

// Helper to determine type from hint
function parseType(hint) {
   hint = hint.toLowerCase();
   if (hint.includes('dropdown') || hint.includes('drop down')) return 'SelectDropdown';
   if (hint.includes('checkbox list') || hint.includes('checkbox scrollable')) return 'CheckboxList';
   if (hint.includes('checkbox')) return 'CheckboxSingle';
   if (hint.includes('text area')) return 'TextAreaInput';
   if (hint.includes('option selection') || hint.includes('show 5 options')) return 'OptionSelection';
   if (hint.includes('text singleline') || hint.includes('text field')) return 'TextInput';
   return 'TextInput';
}

let qIdCounter = 1;
let started = false;

for (let i = 0; i < lines.length; i++) {
   const line = lines[i];

   if (line.match(/^SECTION 1/)) {
      started = true;
   }
   if (!started) continue;

   if (line.match(/^SECTION [123]/)) {
      currentSectionInfo += line + "\n";
      continue;
   }

   if (line.match(/^PART [A-Z]/) || line.match(/^DOMAIN \d+/)) {
      if (currentPart && currentPart.questions.length > 0) {
         questionnaire.push(currentPart);
      }
      let title = line;
      if (lines[i + 1] && !lines[i + 1].includes('//')) {
         title += " - " + lines[i + 1];
         i++;
      }
      currentPart = {
         id: "part_" + qIdCounter++,
         title: title,
         description: currentSectionInfo,
         questions: []
      };
      currentSectionInfo = ""; // Reset block info
      continue;
   }

   if (line.startsWith("CONSENT")) {
      if (currentPart && currentPart.questions.length > 0) {
         questionnaire.push(currentPart);
      }
      currentPart = {
         id: "consent_part",
         title: "CONSENT FORM",
         description: "",
         questions: []
      };
   }

   // Look for standard question markers OR (//...)
   let qMatch = line.match(/^([A-Z]\d+|\d+|G\d+)\.\s+(.*)/);
   let hintMatch = line.match(/\(\/\/(.*?)\)/);

   if (line.match(/^Our organisation/) || (!qMatch && hintMatch)) {
      // It might be a Domain question without a number
      if (!qMatch && line.length > 15 && !line.startsWith('□') && !line.includes('Participant ID')) {
         qMatch = [line, "Q" + qIdCounter, line];
      }
   }

   if (qMatch) {
      if (!currentPart) {
         currentPart = {
            id: "part_intro",
            title: "Introduction",
            description: "",
            questions: []
         };
      }
      if (currentQuestion) {
         currentPart.questions.push(currentQuestion);
      }

      let text = qMatch[0];
      let type = 'TextInput'; // Default
      let options = [];
      let allowOther = false;
      let limit = null;

      if (hintMatch) {
         type = parseType(hintMatch[1]);
         if (hintMatch[1].toLowerCase().includes('other selected')) allowOther = true;
         let limitMatch = hintMatch[1].match(/Up to (\d+)/i);
         if (limitMatch) limit = parseInt(limitMatch[1], 10);
      } else if (currentPart && currentPart.title.includes('DOMAIN')) {
         // Domains have global options usually defined earlier 
         // fallback generic 1-5
         type = "OptionSelection";
         options = ["Strongly Disagree", "Disagree", "Neutral / Unsure", "Agree", "Strongly Agree"];
      }

      // Clean text from hint
      text = text.replace(/\(\/\/.*?\)/g, "").trim();

      currentQuestion = {
         id: "q_" + qIdCounter++,
         text: text,
         type: type,
         options: options,
         allowOther: allowOther,
         limit: limit
      };
      continue;
   }

   if (line.startsWith("□") || line.startsWith("-")) {
      let optText = line.replace(/^[□-]\s*/, "").trim();
      if (currentQuestion) {
         if (!currentQuestion.options) currentQuestion.options = [];
         currentQuestion.options.push(optText);
      }
   }
}

if (currentQuestion) currentPart.questions.push(currentQuestion);
if (currentPart) questionnaire.push(currentPart);

// Write to file
const outputData = `export const questionnaireData = ${JSON.stringify(questionnaire, null, 2)};`;
fs.writeFileSync('../client/src/data/questionnaire.js', outputData, 'utf8');

console.log("Parsed " + questionnaire.length + " parts.");
