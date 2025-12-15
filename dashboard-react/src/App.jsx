import { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import PagesSection from './sections/PagesSection';
import RulesSection from './sections/RulesSection';
import './App.css';

function App() {
  // State management
  const [pages, setPages] = useState([]);
  const [allRules, setAllRules] = useState([]); // Array of all rules from DB
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [pagesRes, rulesRes] = await Promise.all([
        fetch('/api/pages'),
        fetch('/api/rules')
      ]);

      const pagesData = await pagesRes.json();
      const rulesData = await rulesRes.json();

      if (pagesData.success) {
        setPages(pagesData.data);
      }

      if (rulesData.success) {
        setAllRules(rulesData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      window.Swal.fire({
        title: 'Connection Error',
        text: 'Failed to connect to the server. Please ensure the backend is running.',
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter rules for selected page
  // The API returns all rules with page_id, so we filter on the frontend for the selected view
  // Note: API also supports ?page_id=XXX but for simplicity we fetch all and filter here
  // or we can refactor to fetch on selection. Let's keep it simple for now.
  const currentRules = selectedPageId
    ? allRules.filter(r => r.page_id === selectedPageId)
    : [];

  // Page handlers
  const handleAddPage = async (pageData) => {
    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageData)
      });
      const result = await response.json();

      if (result.success) {
        // Refresh data or update local state
        // For accurate timestamps/IDs, usually better to re-fetch or use returned ID
        // Let's just re-fetch for simplicity or append optimistically if we had full object
        // Re-fetching ensures we have the DB ID
        fetchData();

        window.Swal.fire({
          title: 'Success!',
          text: 'Page added successfully',
          icon: 'success',
          confirmButtonColor: '#000000'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      window.Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to add page',
        icon: 'error'
      });
    }
  };

  const handleDeletePage = async (id, name) => {
    window.Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${name}"? All associated rules will be deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/pages/${id}`, { method: 'DELETE' });
          const result = await response.json();

          if (result.success) {
            setPages(prev => prev.filter(p => p.id !== id));
            // Also remove rules for this page from local state
            // Need to find the page_id corresponding to this DB id first if needed, 
            // but filtered lists update automatically if page is gone.
            // However, resetting selection is important.
            const page = pages.find(p => p.id === id);
            if (page && selectedPageId === page.page_id) {
              setSelectedPageId(null);
            }
            fetchData(); // Sync everything

            window.Swal.fire({
              title: 'Deleted!',
              text: 'The page has been deleted.',
              icon: 'success',
              confirmButtonColor: '#000000'
            });
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          window.Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to delete page',
            icon: 'error'
          });
        }
      }
    });
  };

  // Rule handlers
  const handleAddRule = async (ruleData) => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      });
      const result = await response.json();

      if (result.success) {
        fetchData(); // Refresh rules

        window.Swal.fire({
          title: 'Rule Added!',
          text: 'New automation rule has been created.',
          icon: 'success',
          confirmButtonColor: '#000000'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      window.Swal.fire({
        title: 'Error',
        text: error.message || 'Failed to add rule',
        icon: 'error'
      });
    }
  };

  const handleDeleteRule = async (id, keyword) => {
    window.Swal.fire({
      title: 'Delete Rule?',
      text: `Are you sure you want to delete the rule for "${keyword}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(`/api/rules/${id}`, { method: 'DELETE' });
          const result = await response.json();

          if (result.success) {
            setAllRules(prev => prev.filter(r => r.id !== id));

            window.Swal.fire({
              title: 'Deleted!',
              text: 'The rule has been deleted.',
              icon: 'success',
              confirmButtonColor: '#000000'
            });
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          window.Swal.fire({
            title: 'Error',
            text: error.message || 'Failed to delete rule',
            icon: 'error'
          });
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20" style={{ height: '100vh', background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin fa-3x mb-4 text-secondary"></i>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />

      <main className="main-container">
        <div className="container">
          <PagesSection
            pages={pages}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
          />

          <RulesSection
            pages={pages}
            rules={currentRules}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
