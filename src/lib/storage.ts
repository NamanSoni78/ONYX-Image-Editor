import { openDB, DBSchema } from 'idb';
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  lastModified: number;
  data: string; // Fabric JSON string
}

interface OnyxDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'onyx-db';
const STORE_NAME = 'projects';

const getDB = async () => {
  return openDB<OnyxDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('by-date', 'lastModified');
    },
  });
};

export const createProject = async (): Promise<string> => {
  const db = await getDB();
  const id = uuidv4();
  const newProject: Project = {
    id,
    name: `Untitled Project ${new Date().toLocaleDateString()}`,
    lastModified: Date.now(),
    data: JSON.stringify({ version: '5.3.0', objects: [] }), // Empty canvas
  };
  await db.put(STORE_NAME, newProject);
  return id;
};

export const getProject = async (id: string): Promise<Project | undefined> => {
  const db = await getDB();
  return db.get(STORE_NAME, id);
};

export const getAllProjects = async (): Promise<Project[]> => {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
};

export const updateProject = async (id: string, data: string, thumbnail?: string, name?: string) => {
  const db = await getDB();
  const project = await db.get(STORE_NAME, id);
  if (!project) return;

  const updatedProject = {
    ...project,
    data,
    lastModified: Date.now(),
    ...(thumbnail ? { thumbnail } : {}),
    ...(name ? { name } : {}),
  };
  await db.put(STORE_NAME, updatedProject);
};

export const deleteProject = async (id: string) => {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
};

export const renameProject = async (id: string, newName: string) => {
  const db = await getDB();
  const project = await db.get(STORE_NAME, id);
  if (!project) return;

  const updatedProject = {
    ...project,
    name: newName,
    lastModified: Date.now(),
  };
  await db.put(STORE_NAME, updatedProject);
};

export const importProject = async (file: File): Promise<string | null> => {
  try {
    const text = await file.text();
    const projectData = JSON.parse(text);

    // Basic validation
    if (!projectData.data || !projectData.name) {
      throw new Error('Invalid project file');
    }

    const db = await getDB();
    const id = uuidv4();
    const newProject: Project = {
      id,
      name: projectData.name,
      thumbnail: projectData.thumbnail,
      lastModified: Date.now(),
      data: projectData.data,
    };

    await db.put(STORE_NAME, newProject);
    return id;
  } catch (e) {
    console.error('Import failed:', e);
    return null;
  }
};
