import { Routes, Route } from "react-router-dom";
import { Card, CardBody, CardHeader, Container, Text, Title, Button, Header, Footer } from "@heroui/react";
import { APITester } from "./APITester";
import "./index.css";

export function App() {
  return (
    <Container className="min-h-screen flex flex-col">
      <Header className="bg-primary text-white p-4">
        <Title>Frühstücksbowls Bestellsystem</Title>
      </Header>
      
      <main className="flex-1 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <Card>
                <CardHeader>
                  <Text size="h2">Willkommen</Text>
                </CardHeader>
                <CardBody>
                  <Text>Hier entsteht das Frühstücksbowls Bestellsystem</Text>
                  <APITester />
                </CardBody>
              </Card>
            } 
          />
        </Routes>
      </main>

      <Footer className="bg-gray-100 p-4 text-center">
        <Text small>&copy; 2025 Frühstücksbowls Bestellsystem</Text>
      </Footer>
    </Container>
  );
}

export default App;
