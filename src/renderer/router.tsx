import { createHashRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Downloads } from './pages/Downloads';
import { Preview } from './pages/Preview';
import { History } from './pages/History';
import { Config } from './pages/Config';
import { Auth } from './pages/Auth';
import { Settings } from './pages/Settings';
import { Credits } from './pages/Credits';
import { Dedup } from './pages/Dedup';

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Downloads />,
      },
      {
        path: 'preview',
        element: <Preview />,
      },
      {
        path: 'history',
        element: <History />,
      },
      {
        path: 'config',
        element: <Config />,
      },
      {
        path: 'auth',
        element: <Auth />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'dedup',
        element: <Dedup />,
      },
      {
        path: 'credits',
        element: <Credits />,
      },
    ],
  },
]);
