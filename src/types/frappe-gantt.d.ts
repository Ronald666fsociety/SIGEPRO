declare module 'frappe-gantt' {
  interface GanttTask {
    id: string
    name: string
    start: string
    end: string
    progress: number
    dependencies: string
  }

  interface GanttOptions {
    view_mode?: 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year'
    date_format?: string
    bar_height?: number
    bar_corner_radius?: number
    arrow_curve?: number
    padding?: number
    language?: string
  }

  class Gantt {
    constructor(
      wrapper: string | SVGElement | HTMLElement,
      tasks: GanttTask[],
      options?: GanttOptions
    )
  }

  export default Gantt
}
