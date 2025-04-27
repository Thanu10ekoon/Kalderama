import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import { useState } from 'react';
import LoginPage from './LoginPage.jsx';
import SignupPage from './SignupPage.jsx';
import App from './App.jsx';
import OwnerDashboard from './OwnerDashboard.jsx';

function Root() {
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState(null);
  const [view, setView] = useState('login');

  if (view === 'login') {
    return <LoginPage onLogin={(role, username) => {
      setRole(role);
      setUsername(username);
      setView(role === 'owner' ? 'owner' : 'customer');
    }} onSignup={() => setView('signup')} />;
  }
  if (view === 'signup') {
    return <SignupPage onBack={() => setView('login')} />;
  }
  if (view === 'owner') {
    return <OwnerDashboard owner={{ username }} onLogout={() => {
      setRole(null);
      setUsername(null);
      setView('login');
    }} />;
  }
  if (view === 'customer') {
    return <App user={{ username }} onLogout={() => {
      setRole(null);
      setUsername(null);
      setView('login');
    }} />;
  }
  return null;
}

export default Root;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
