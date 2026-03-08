import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorFallback from './ErrorFallback.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorFallback>
            <App />
        </ErrorFallback>
    </React.StrictMode>,
)
