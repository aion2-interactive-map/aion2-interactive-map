import { createFileRoute } from "@tanstack/react-router";

import WikiHome from "@/features/wiki/WikiHome";

export const Route = createFileRoute("/wiki/")({ component: WikiHome });
