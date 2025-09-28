import React, { useEffect } from 'react';
import './Toast.css';


const Toast = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  return (
    <div className="toast">
      <img src="../frontend/icons/vos.png" alt="icon" className="toast-icon" />
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast;
