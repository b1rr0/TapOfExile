import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import WikiLayout from './components/WikiLayout';

// Landing pages
import LandingPage from './pages/LandingPage';
import ChampionsPage from './pages/ChampionsPage';

// Trade
import TradePage from './pages/TradePage';

// Wiki pages
import WikiHomePage from './pages/WikiHomePage';
import CharactersPage from './pages/CharactersPage';
import EquipmentPage from './pages/EquipmentPage';
import EnemiesPage from './pages/EnemiesPage';
import SkillTreePage from './pages/SkillTreePage';
import DamagePage from './pages/DamagePage';
import PlotPage from './pages/PlotPage';
import MapsPage from './pages/MapsPage';

// Fullscreen pages (no layout)
import CharacterTreePage from './pages/CharacterTreePage';
import SkillTreeBuilderPage from './pages/SkillTreeBuilderPage';
import FigureMapPage from './pages/FigureMapPage';

export default function App() {
  return (
    <Routes>
      {/* Fullscreen pages — no Layout wrapper */}
      <Route path="character/:characterId/asterism" element={<CharacterTreePage />} />
      <Route path="asterism/builder" element={<SkillTreeBuilderPage />} />
      <Route path="asterism/figures" element={<FigureMapPage />} />

      {/* Landing layout — hero, leagues, champions, asterism preview */}
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="champions" element={<ChampionsPage />} />
        <Route path="trade" element={<TradePage />} />

        {/* Wiki sub-section with its own sub-nav */}
        <Route path="wiki" element={<WikiLayout />}>
          <Route index element={<WikiHomePage />} />
          <Route path="characters" element={<CharactersPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="enemies" element={<EnemiesPage />} />
          <Route path="asterism" element={<SkillTreePage />} />
          <Route path="damage" element={<DamagePage />} />
          <Route path="plot" element={<PlotPage />} />
          <Route path="maps" element={<MapsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
