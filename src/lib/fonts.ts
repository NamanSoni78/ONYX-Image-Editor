export const MORE_FONTS = [
    'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro', 'Slabo 27px', 'Raleway',
    'PT Sans', 'Merriweather', 'Noto Sans', 'Nunito', 'Concert One', 'Prompt', 'Work Sans',
    'Creepster', 'Abril Fatface', 'Anton', 'Bangers', 'Righteous', 'Fredoka One', 'Lobster',
    'Cinzel', 'Satisfy', 'Great Vibes', 'Courgette', 'Sacramento', 'Orbitron', 'Russo One'
];

export const loadFonts = () => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${MORE_FONTS.map(f => f.replace(/ /g, '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
};
