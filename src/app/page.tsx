export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="text-center space-y-3">
        <div className="text-5xl mb-4">🐱</div>
        <h1 className="text-2xl font-bold">MeowAlert</h1>
        <p className="text-muted-foreground">街貓接力 — 一起幫助台灣街貓</p>
        <p className="text-sm text-muted-foreground mt-4">Milestone 0: 專案初始化完成</p>
      </div>
    </div>
  );
}
