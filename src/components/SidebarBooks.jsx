import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight, Menu, Zap } from 'lucide-react';

export default function SidebarBooks({
  books,
  activeBookId,
  onSelectBook,
  onCreateBook,
  onRenameBook,
  onDeleteBook,
  isCollapsed,
  onToggleCollapse
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newBookName.trim()) return;
    onCreateBook(newBookName.trim());
    setNewBookName('');
    setIsAdding(false);
  };

  const handleRenameSubmit = (id, e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onRenameBook(id, editName.trim());
    setEditingId(null);
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button
          className="icon-button"
          onClick={onToggleCollapse}
          title="Expand Notebooks"
        >
          <Menu size={16} />
        </button>
        <div className="collapsed-title">NOTEBOOKS</div>
      </div>
    );
  }

  return (
    <aside className="sidebar-section books-sidebar">
      <div className="sidebar-header">
        <div className="header-title">
          <button className="icon-button menu-btn" onClick={onToggleCollapse} title="Toggle Navigation">
            <Menu size={16} />
          </button>
          <BookOpen className="header-icon" size={15} />
          <h2>Notebooks</h2>
        </div>
        <div className="header-actions">
          <button
            className="icon-button add-button"
            onClick={() => setIsAdding(true)}
            title="Create New Section / Notebook"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {isAdding && (
        <form className="inline-form" onSubmit={handleAddSubmit}>
          <input
            type="text"
            placeholder="Section name..."
            value={newBookName}
            onChange={(e) => setNewBookName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="action-btn success">
            <Check size={14} />
          </button>
          <button
            type="button"
            className="action-btn cancel"
            onClick={() => setIsAdding(false)}
          >
            <X size={14} />
          </button>
        </form>
      )}

      <div className="sidebar-list">
        {books.length === 0 ? (
          <div className="empty-state">No notebooks yet. Click + New Section to create one!</div>
        ) : (
          books.map((book) => {
            const isActive = book.id === activeBookId;
            const isEditing = editingId === book.id;

            if (isEditing) {
              return (
                <form
                  key={book.id}
                  className="inline-form"
                  onSubmit={(e) => handleRenameSubmit(book.id, e)}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="action-btn success">
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    className="action-btn cancel"
                    onClick={() => setEditingId(null)}
                  >
                    <X size={14} />
                  </button>
                </form>
              );
            }

            return (
              <div
                key={book.id}
                className={`sidebar-item onenote-section-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectBook(book.id)}
              >
                {isActive && <div className="active-section-indicator"></div>}
                <div className="item-content">
                  <span className="section-bullet-icon">📔</span>
                  <span className="item-title">{book.name}</span>
                </div>
                <div className="item-controls">
                  <button
                    className="item-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(book.id);
                      setEditName(book.name);
                    }}
                    title="Rename Section"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="item-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete section "${book.name}" and all its pages?`)) {
                        onDeleteBook(book.id);
                      }
                    }}
                    title="Delete Section"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}

        <button
          className="add-new-section-btn"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} /> New Section
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="quick-notes-btn">
          <Zap size={14} /> Quick Notes
        </button>
      </div>
    </aside>
  );
}
