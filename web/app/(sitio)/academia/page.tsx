import { permanentRedirect } from "next/navigation";

// La Academia no tiene portada propia: se entra directo a los cursos.
export default function Academia() {
  permanentRedirect("/academia/cursos");
}
