export default defineContentScript({
  matches: ['*://class.utp.edu.pe/*'],
  main() {
    // aquí analizas el DOM, detectas botones, tareas, etc.
  },
});