import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err.response?.data || err)
);

// Boards
export const boardsApi = {
  getAll:       ()        => api.get('/boards'),
  getById:      (id)      => api.get(`/boards/${id}`),
  create:       (data)    => api.post('/boards', data),
  update:       (id, data)=> api.patch(`/boards/${id}`, data),
  delete:       (id)      => api.delete(`/boards/${id}`),
  getActivity:  (id)      => api.get(`/boards/${id}/activity`),
};

// Lists
export const listsApi = {
  create:   (data)     => api.post('/lists', data),
  update:   (id, data) => api.patch(`/lists/${id}`, data),
  delete:   (id)       => api.delete(`/lists/${id}`),
  reorder:  (lists)    => api.post('/lists/reorder', { lists }),
};

// Cards
export const cardsApi = {
  getById:   (id)       => api.get(`/cards/${id}`),
  create:    (data)     => api.post('/cards', data),
  update:    (id, data) => api.patch(`/cards/${id}`, data),
  delete:    (id)       => api.delete(`/cards/${id}`),
  reorder:   (cards)    => api.post('/cards/reorder', { cards }),

  addLabel:    (id, label_id)   => api.post(`/cards/${id}/labels`, { label_id }),
  removeLabel: (id, labelId)    => api.delete(`/cards/${id}/labels/${labelId}`),
  addMember:   (id, member_id)  => api.post(`/cards/${id}/members`, { member_id }),
  removeMember:(id, memberId)   => api.delete(`/cards/${id}/members/${memberId}`),

  addChecklist:       (id, title)             => api.post(`/cards/${id}/checklists`, { title }),
  deleteChecklist:    (id, clId)              => api.delete(`/cards/${id}/checklists/${clId}`),
  addChecklistItem:   (id, clId, title)       => api.post(`/cards/${id}/checklists/${clId}/items`, { title }),
  updateChecklistItem:(id, clId, itemId, data)=> api.patch(`/cards/${id}/checklists/${clId}/items/${itemId}`, data),
  deleteChecklistItem:(id, clId, itemId)      => api.delete(`/cards/${id}/checklists/${clId}/items/${itemId}`),

  addComment:    (id, content) => api.post(`/cards/${id}/comments`, { content }),
  deleteComment: (id, cmId)   => api.delete(`/cards/${id}/comments/${cmId}`),
};

// Members
export const membersApi = {
  getAll:     () => api.get('/members'),
  getDefault: () => api.get('/members/default'),
};

// Search
export const searchApi = {
  cards: (params) => api.get('/search/cards', { params }),
};

export default api;
