// Ghost data structure for managing ghost types and their properties
import drySkinImage from './assets/images/Dry-Skin.png';
import dullSkinImage from './assets/images/Dull-Skin.png';
import flakySkinImage from './assets/images/Flaky-Skin.png';
import itchySkinImage from './assets/images/Itchy-Skin.png';
import paperySkinImage from './assets/images/Papery-Skin.png';
import roughSkinImage from './assets/images/Rough-Skin.png';
import tightSkinImage from './assets/images/Tight-Skin.png';
import unhealthySkinImage from './assets/images/Unhealthy-Skin.png';

export interface GhostType {
  id: string;
  name: string;
  image: string;
  color: string; // Fallback color for UI elements if needed
}

export const GHOST_TYPES: GhostType[] = [
  {
    id: 'g1',
    name: 'Dry Skin',
    image: drySkinImage,
    color: '#FF6B6B',
  },
  {
    id: 'g2',
    name: 'Dull Skin',
    image: dullSkinImage,
    color: '#95A5A6',
  },
  {
    id: 'g3',
    name: 'Flaky Skin',
    image: flakySkinImage,
    color: '#F39C12',
  },
  {
    id: 'g4',
    name: 'Itchy Skin',
    image: itchySkinImage,
    color: '#E74C3C',
  },
  {
    id: 'g5',
    name: 'Papery Skin',
    image: paperySkinImage,
    color: '#ECF0F1',
  },
  {
    id: 'g6',
    name: 'Rough Skin',
    image: roughSkinImage,
    color: '#8B4513',
  },
  {
    id: 'g7',
    name: 'Inelastic Skin',
    image: tightSkinImage,
    color: '#9B59B6',
  },
  {
    id: 'g8',
    name: 'Unhealthy Skin',
    image: unhealthySkinImage,
    color: '#34495E',
  },
];

// Helper function to get ghost type by ID
export const getGhostTypeById = (id: string): GhostType | undefined => {
  return GHOST_TYPES.find(type => type.id === id);
};

// Helper function to get ghost type by index
export const getGhostTypeByIndex = (index: number): GhostType | undefined => {
  return GHOST_TYPES[index];
};

