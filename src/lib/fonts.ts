/**
 * Extra Google Fonts available inside the editor's text tool.
 * v2: trimmed from 28 to 6 families — every family was a blocking request
 * in v1, which hurt first paint on mobile.
 */
export const MORE_FONTS = ['Montserrat', 'Oswald', 'Anton', 'Lobster', 'Righteous', 'Orbitron'];

export const loadFonts = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('onyx-extra-fonts')) return;
  const link = document.createElement('link');
  link.id = 'onyx-extra-fonts';
  link.href = `https://fonts.googleapis.com/css2?family=${MORE_FONTS.map((f) => f.replace(/ /g, '+')).join('&family=')}&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};
