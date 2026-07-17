import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const sections = [
  {
    title: "Gear Planner",
    path: "/gear",
    description: "Plan gear loadouts, compare stats, and import characters or players.",
  },
  {
    title: "Monsters",
    path: "/monsters",
    description: "Browse monsters, drops, achievements, and search or sort the list.",
  },
  {
    title: "Market",
    path: "/market",
    description: "See what merchants are buying and selling across Adventure Land.",
  },
  {
    title: "Bank",
    path: "/bank",
    description: "View shared bank data from community contributors.",
  },
];

export function Welcome() {
  return (
    <Box sx={{ maxWidth: 720, margin: "0 auto", textAlign: "left" }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: "center" }}>
        AL Data Explorer
      </Typography>
      <Typography sx={{ marginBottom: 3, textAlign: "center" }}>
        Tools for exploring Adventure Land game data, market prices, and community bank information.
      </Typography>

      {sections.map((section) => (
        <Card key={section.path} sx={{ marginBottom: 2 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              {section.title}
            </Typography>
            <Typography sx={{ marginBottom: 2 }}>{section.description}</Typography>
            <Button variant="contained" component={RouterLink} to={section.path}>
              Open {section.title}
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
