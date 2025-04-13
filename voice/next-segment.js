// Get data from segment, prepare it to be spoken
const response = {
  hasSegment: true,
  id: segment.id,
  text: segment.text,
  audioUrl: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
};

console.log(`Returning segment ${segment.id} for speaking with audio URL`); 