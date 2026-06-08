export const FARM_STATUS = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Completed: 'Completed',
  PendingSync: 'Pending-Sync'
}

export const FARM_STATUS_LIST = ['All', FARM_STATUS.Pending, FARM_STATUS.InProgress, FARM_STATUS.Completed, FARM_STATUS.PendingSync]

export const ASSESSMENT_CONDITION = {
  Good: 'Good',
  Moderate: 'Moderate',
  Bad: 'Bad'
}

export const ASSESSMENT_CONDITION_LIST = ['All', ASSESSMENT_CONDITION.Good, ASSESSMENT_CONDITION.Moderate, ASSESSMENT_CONDITION.Bad]

export const SYNC_STATUS = {
  Pending: 'pending',
  Synced: 'synced'
}
