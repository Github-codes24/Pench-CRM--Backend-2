// const SHAPE_COLOR_CODES = [
//   { code: "★", color: "red", name: "star-red" },
//   { code: "✱", color: "blue", name: "sun-blue" },
//   { code: "■", color: "green", name: "square-green" },
//   { code: "●", color: "purple", name: "circle-purple" },
//   { code: "■", color: "yellow", name: "square-yellow" },
//   { code: "●", color: "blue", name: "circle-blue" },
//   { code: "★", color: "pink", name: "star-pink" },
//   { code: "●", color: "orange", name: "circle-orange" },
//   { code: "▲", color: "yellow", name: "triangle-yellow" },
//   { code: "■", color: "orange", name: "square-orange" }
// ];

// const OPERATORS = [
//   { code: "+", func: (a, b) => a + b },
//   { code: "-", func: (a, b) => a - b },
//   { code: "×", func: (a, b) => a * b }
// ];

// // Helper: shuffle array
// function shuffleArray(array) {
//   return array.sort(() => Math.random() - 0.5);
// }

// // Assign random values from 0–9 (no duplicate values)
// function assignRandomValues() {
//   const valuesPool = shuffleArray(Array.from({ length: 10 }, (_, i) => i)); // [0,1,...,9]
//   return SHAPE_COLOR_CODES.map((item, index) => ({
//     ...item,
//     value: valuesPool[index]
//   }));
// }

// // Pick random element from array
// function randomElement(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// // Generate question
// function generateRandomQuestion() {
//   const SHAPE_COLOR_VALUES = assignRandomValues();

//   const terms = [
//     randomElement(SHAPE_COLOR_VALUES),
//     randomElement(SHAPE_COLOR_VALUES),
//     randomElement(SHAPE_COLOR_VALUES)
//   ];

//   const op1 = randomElement(OPERATORS);
//   const op2 = randomElement(OPERATORS);

//   const val1 = terms[0].value;
//   const val2 = terms[1].value;
//   const val3 = terms[2].value;

//   const answerValue = op2.func(op1.func(val1, val2), val3);
//   const questionText = `${terms[0].code} ${op1.code} ${terms[1].code} ${op2.code} ${terms[2].code} = ?`;

//   let optionVals = [answerValue];
//   while (optionVals.length < 4) {
//     const fakeVal = Math.floor(Math.random() * 10); // 0–9
//     if (!optionVals.includes(fakeVal)) optionVals.push(fakeVal);
//   }

//   optionVals = shuffleArray(optionVals);

//   const options = optionVals.map((v, i) => ({
//     label: String.fromCharCode(65 + i),
//     value: v.toString()
//   }));

//   const correctAnswer = options.find(o => Number(o.value) === answerValue)?.label || "A";

//   return {
//     questionText,
//     symbols: terms.map(t => t.name),
//     operators: [op1.code, op2.code],
//     options,
//     correctAnswer,
//     answerValue,
//     shapeColorValues: SHAPE_COLOR_VALUES
//   };
// }

// module.exports = { generateRandomQuestion };

const SHAPE_COLOR_CODES = [
  { code: "★", color: "red", name: "star-red" },
  { code: "✱", color: "blue", name: "sun-blue" },
  { code: "■", color: "green", name: "square-green" },
  { code: "●", color: "purple", name: "circle-purple" },
  { code: "■", color: "yellow", name: "square-yellow" },
  { code: "●", color: "blue", name: "circle-blue" },
  { code: "★", color: "pink", name: "star-pink" },
  { code: "●", color: "orange", name: "circle-orange" },
  { code: "▲", color: "yellow", name: "triangle-yellow" },
  { code: "■", color: "orange", name: "square-orange" }
];

const OPERATORS = [
  { code: "+", func: (a, b) => a + b },
  { code: "-", func: (a, b) => a - b },
  { code: "×", func: (a, b) => a * b }
];

function shuffleArray(array) {
  return array.sort(() => Math.random() - 0.5);
}

function assignRandomValues() {
  const valuesPool = shuffleArray(Array.from({ length: 10 }, (_, i) => i));
  return SHAPE_COLOR_CODES.map((item, index) => ({
    ...item,
    value: valuesPool[index]
  }));
}

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomQuestion(shapeColorValues) {
  const SHAPE_COLOR_VALUES = shapeColorValues || assignRandomValues();

  const terms = [
    randomElement(SHAPE_COLOR_VALUES),
    randomElement(SHAPE_COLOR_VALUES),
    randomElement(SHAPE_COLOR_VALUES)
  ];

  const op1 = randomElement(OPERATORS);
  const op2 = randomElement(OPERATORS);

  const val1 = terms[0].value;
  const val2 = terms[1].value;
  const val3 = terms[2].value;

  const answerValue = op2.func(op1.func(val1, val2), val3);
  const questionText = `${terms[0].code} ${op1.code} ${terms[1].code} ${op2.code} ${terms[2].code} = ?`;

  let optionVals = [answerValue];
  while (optionVals.length < 4) {
    const fakeVal = Math.floor(Math.random() * 10);
    if (!optionVals.includes(fakeVal)) optionVals.push(fakeVal);
  }

  optionVals = shuffleArray(optionVals);

  const options = optionVals.map((v, i) => ({
    label: String.fromCharCode(65 + i),
    value: v.toString()
  }));

  const correctAnswer = options.find(o => Number(o.value) === answerValue)?.label || "A";

  return {
    questionText,
    symbols: terms.map(t => t.name),
    operators: [op1.code, op2.code],
    options,
    correctAnswer,
    answerValue,
    shapeColorValues: SHAPE_COLOR_VALUES
  };
}

module.exports = {
  generateRandomQuestion,
  assignRandomValues
};
