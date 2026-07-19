import { type DashboardBucket } from "@dealflow/shared";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dealflow/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const config = {
  sent: { label: "Enviados", color: "var(--chart-1)" },
  failed: { label: "Falhas", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function DashboardChart(props: Readonly<{ data: DashboardBucket[] }>) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={props.data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={2} />
        <Bar dataKey="failed" fill="var(--color-failed)" radius={2} />
      </BarChart>
    </ChartContainer>
  );
}
