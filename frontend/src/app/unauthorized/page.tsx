import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">403</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para acceder a esta página.</p>
        <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
