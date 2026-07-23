import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, BarChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([
  LineChart,
  BarChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  LegendComponent,
  CanvasRenderer,
])

interface EChartWrapperProps {
  option: EChartsCoreOption
  height?: string
  className?: string
}

/**
 * Wrapper propio sobre Apache ECharts v5 (decisión del stack: se descartó
 * echarts-for-react por incidente de seguridad en npm y peer dependency
 * inestable con React 19). Tree-shaking por módulos + ResizeObserver.
 */
export function EChartWrapper({ option, height = '300px', className = '' }: EChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    chartRef.current = echarts.init(containerRef.current)
    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: false })
  }, [option])

  return <div ref={containerRef} style={{ height, width: '100%' }} className={className} />
}
