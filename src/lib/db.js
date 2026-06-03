import { openDB } from 'idb'

const DB_NAME = 'flood-assessment-db'
const DB_VERSION = 2

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
    
  // Assessments store
  if (!db.objectStoreNames.contains('assessments')) {
    const store = db.createObjectStore('assessments', { keyPath: 'id' })
    store.createIndex('syncStatus', 'syncStatus')
    store.createIndex('createdAt', 'createdAt')
  }
  // Photos store
  if (!db.objectStoreNames.contains('photos')) {
    const photoStore = db.createObjectStore('photos', { keyPath: 'id' })
    photoStore.createIndex('assessmentId', 'assessmentId')
  }
  // Farms store — NEW
  if (!db.objectStoreNames.contains('farms')) {
    const farmStore = db.createObjectStore('farms', { keyPath: 'id' })
    farmStore.createIndex('assignedToName', 'assignedToName')
  }

    }
  })
}

export async function saveAssessment(assessment) {
  const db = await getDB()
  await db.put('assessments', {
    ...assessment,
    updatedAt: new Date().toISOString()
  })
  return assessment
}

export async function getAllAssessments() {
  const db = await getDB()
  const all = await db.getAll('assessments')
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function getAssessment(id) {
  const db = await getDB()
  return db.get('assessments', id)
}

export async function deleteAssessment(id) {
  const db = await getDB()
  const photos = await db.getAllFromIndex('photos', 'assessmentId', id)
  const tx = db.transaction(['assessments', 'photos'], 'readwrite')
  await Promise.all([
    tx.objectStore('assessments').delete(id),
    ...photos.map(p => tx.objectStore('photos').delete(p.id))
  ])
  await tx.done
}

export async function savePhoto(photo) {
  const db = await getDB()
  await db.put('photos', photo)
  return photo
}

export async function getPhotosForAssessment(assessmentId) {
  const db = await getDB()
  return db.getAllFromIndex('photos', 'assessmentId', assessmentId)
}

export async function deletePhoto(photoId) {
  const db = await getDB()
  await db.delete('photos', photoId)
}

export async function getPendingAssessments() {
  const db = await getDB()
  return db.getAllFromIndex('assessments', 'syncStatus', 'pending')
}

export async function markAsSynced(id) {
  const db = await getDB()
  const assessment = await db.get('assessments', id)
  if (assessment) {
    assessment.syncStatus = 'synced'
    assessment.syncedAt = new Date().toISOString()
    await db.put('assessments', assessment)
  }
}

export async function getStats() {
  const all = await getAllAssessments()
  return {
    total: all.length,
    pending: all.filter(a => a.syncStatus === 'pending').length,
    synced: all.filter(a => a.syncStatus === 'synced').length,
    good: all.filter(a => a.condition === 'Good').length,
    moderate: all.filter(a => a.condition === 'Moderate').length,
    bad: all.filter(a => a.condition === 'Bad').length,
    totalChickens: all.reduce((sum, a) => sum + (parseInt(a.chickenCount) || 0), 0)
  }
}

// ── Farm Assignments ──────────────────────
export async function saveFarms(farms) {
  const db = await getDB()
  const tx = db.transaction('farms', 'readwrite')
  
  // Clear existing
  await tx.store.clear()
  
  // Save all
  for (const farm of farms) {
    await tx.store.put(farm)
  }
  
  await tx.done
}

export async function getAllFarms() {
  const db = await getDB()
  return await db.getAll('farms')
}

export async function getFarmsByAssignee(userName) {
  const db = await getDB()
  const farms = await db.getAll('farms')
  return farms.filter(f => f.assignedToName === userName)
}