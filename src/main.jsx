import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Conquest from './Conquest.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Conquest />
  </StrictMode>,
)
