import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaCheck, FaPhone, FaEnvelope, FaUser, FaFilter, FaSort, FaSearch, FaClock } from 'react-icons/fa';
import './App.css';

const App = () => {
  // State for enquiries data
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');

  // State for editing and modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEnquiry, setCurrentEnquiry] = useState(null);
  const [formData, setFormData] = useState({
    uname: '',
    email: '',
    mobile: '',
    contacted: false,
    followup_date: '',
    notes: '',
    status: 'new',
    submission_datetime: ''
  });

  // API base URL
  const API_BASE_URL = 'https://v1-be.onrender.com';

  // Fetch enquiries from the server
  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/admin/enquiries`;
      
      // Add query parameters for sorting and filtering
      const params = new URLSearchParams();
      if (sortField) params.append('sort', sortField);
      if (sortDirection) params.append('direction', sortDirection);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enquiries');
      }
      
      const data = await response.json();
      setEnquiries(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEnquiries();
  }, [sortField, sortDirection, filterStatus]);

  // Handle search with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchEnquiries();
    }, 500);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle status toggle (contacted, interested, etc.)
  const handleStatusUpdate = async (id, field, value) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Update local state
      setEnquiries(enquiries.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Delete an enquiry
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/enquiries/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete enquiry');
      }
      
      // Remove from local state
      setEnquiries(enquiries.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting enquiry:', err);
      alert('Failed to delete enquiry. Please try again.');
    }
  };

  // Open modal to edit an enquiry
  const openEditModal = (enquiry) => {
    setCurrentEnquiry(enquiry);
    setFormData({
      uname: enquiry.uname,
      email: enquiry.email,
      mobile: enquiry.mobile,
      contacted: enquiry.contacted || false,
      followup_date: enquiry.followup_date || '',
      notes: enquiry.notes || '',
      status: enquiry.status || 'new',
      submission_datetime: enquiry.submission_datetime || ''
    });
    setIsModalOpen(true);
  };

  // Handle form submission for edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/enquiries/${currentEnquiry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update enquiry');
      }
      
      const updatedEnquiry = await response.json();
      
      // Update local state
      setEnquiries(enquiries.map(item =>
        item.id === currentEnquiry.id ? updatedEnquiry : item
      ));
      
      // Close modal
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error updating enquiry:', err);
      alert('Failed to update enquiry. Please try again.');
    }
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Format date and time for display
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const statusClasses = {
      new: 'badge-new',
      contacted: 'badge-contacted',
      interested: 'badge-interested',
      not_interested: 'badge-not-interested',
      converted: 'badge-converted'
    };
    return `status-badge ${statusClasses[status] || 'badge-new'}`;
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Parandur Enquiries Admin Dashboard</h1>
      </header>
      
      <div className="dashboard-controls">
        <div className="search-container">
          <FaSearch />
          <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-select">
            <FaFilter />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Loading enquiries...</div>
      ) : error ? (
        <div className="error-message">Error: {error}</div>
      ) : (
        <div className="enquiries-container">
          <table className="enquiries-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('uname')}>
                  Name {sortField === 'uname' && <FaSort />}
                </th>
                <th onClick={() => handleSort('email')}>
                  Email {sortField === 'email' && <FaSort />}
                </th>
                <th onClick={() => handleSort('mobile')}>
                  Mobile {sortField === 'mobile' && <FaSort />}
                </th>
                <th onClick={() => handleSort('created_at')}>
                  Date {sortField === 'created_at' && <FaSort />}
                </th>
                <th onClick={() => handleSort('submission_datetime')}>
                  Submission Time {sortField === 'submission_datetime' && <FaSort />}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && <FaSort />}
                </th>
                <th>Contacted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-data">No enquiries found</td>
                </tr>
              ) : (
                enquiries.map(enquiry => (
                  <tr key={enquiry.id}>
                    <td>{enquiry.uname}</td>
                    <td>{enquiry.email}</td>
                    <td>{enquiry.mobile}</td>
                    <td>{formatDate(enquiry.created_at)}</td>
                    <td>{formatDateTime(enquiry.submission_datetime)}</td>
                    <td>
                      <span className={getStatusBadge(enquiry.status)}>
                        {enquiry.status?.replace('_', ' ') || 'New'}
                      </span>
                    </td>
                    <td>
                      <label className="toggle">
                        <input 
                          type="checkbox" 
                          checked={enquiry.contacted || false} 
                          onChange={(e) => handleStatusUpdate(enquiry.id, 'contacted', e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </td>
                    <td className="action-buttons">
                      <button 
                        className="btn-edit" 
                        onClick={() => openEditModal(enquiry)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(enquiry.id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                      <button 
                        className="btn-call" 
                        onClick={() => window.open(`tel:${enquiry.mobile}`)}
                        title="Call"
                      >
                        <FaPhone />
                      </button>
                      <button 
                        className="btn-email" 
                        onClick={() => window.open(`mailto:${enquiry.email}`)}
                        title="Email"
                      >
                        <FaEnvelope />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Edit Modal */}
      {isModalOpen && currentEnquiry && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Enquiry</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  <FaUser />
                  Name:
                </label>
                <input type="text" name="uname" value={formData.uname} onChange={handleInputChange} required />
              </div>
              
              <div className="form-group">
                <label>
                  <FaEnvelope />
                  Email:
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              
              <div className="form-group">
                <label>
                  <FaPhone />
                  Mobile:
                </label>
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} required pattern="[0-9]{10}" />
              </div>
              
              <div className="form-group">
                <label>
                  <FaCheck />
                  Status:
                </label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" name="contacted" checked={formData.contacted} onChange={handleInputChange} />
                  Contacted
                </label>
              </div>
              
              <div className="form-group">
                <label>
                  <FaClock />
                  Submission Date & Time:
                </label>
                <div className="datetime-display">
                  {formatDateTime(formData.submission_datetime) || "Not recorded"}
                </div>
              </div>
              
              <div className="form-group">
                <label>Follow-up Date:</label>
                <input type="date" name="followup_date" value={formData.followup_date} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label>Notes:</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" />
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
