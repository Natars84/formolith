import { Routes, Route } from "react-router-dom";
import FormsList from "./pages/FormsList";
import FormHub from "./pages/FormHub";
import FormBuilder from "./pages/FormBuilder";
import FormPreview from "./pages/FormPreview";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<FormsList />} />
      <Route path="/forms/:formId" element={<FormHub />} />
      <Route path="/forms/:formId/builder" element={<FormBuilder />} />
      <Route path="/forms/:formId/preview" element={<FormPreview />} />
    </Routes>
  );
}
