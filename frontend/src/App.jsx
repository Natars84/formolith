import { Routes, Route } from "react-router-dom";
import { BlockTypesProvider } from "./context/BlockTypesContext";
import FormsList from "./pages/FormsList";
import FormHub from "./pages/FormHub";
import FormBuilder from "./pages/FormBuilder";
import FormPreview from "./pages/FormPreview";
import FormPublic from "./pages/FormPublic";

export default function App() {
  return (
    <BlockTypesProvider>
      <Routes>
        <Route path="/" element={<FormsList />} />
        <Route path="/forms/:formId" element={<FormHub />} />
        <Route path="/forms/:formId/builder" element={<FormBuilder />} />
        <Route path="/forms/:formId/preview" element={<FormPreview />} />
        <Route path="/f/:token" element={<FormPublic />} />
      </Routes>
    </BlockTypesProvider>
  );
}
