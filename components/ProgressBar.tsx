type ProgressBarProps = {
    percent: number;
}

export default function ProgressBar(props: ProgressBarProps) {
  return (
    <div class="w-full bg-gray-200 rounded-full dark:bg-gray-700">
      <div
        class="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
        style={`width: ${props.percent}%`}
      >
        {props.percent}%
      </div>
    </div>
  );
}
