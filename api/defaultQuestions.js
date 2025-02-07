// api/defaultQuestions.js

export default function handler(req, res) {
  // Define your default questions here
  const defaultQuestions = [
    'Hello',
    'How are you?',
    'AskHandle’s mission',
    'AskHandle introduction',
    'What is Generative AI?',
  ];

  // Send the questions as a JSON response
  res.status(200).json({ questions: defaultQuestions });
}
