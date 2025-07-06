import { MantineProvider } from '@mantine/core';
import { PlacesList } from './components';
import '@mantine/core/styles.css';

function App() {
  return (
    <MantineProvider>
      <PlacesList />
    </MantineProvider>
  );
}

export default App
