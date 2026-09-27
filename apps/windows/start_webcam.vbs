Set WshShell = CreateObject("WScript.Shell")
pythonPath = "C:\Users\Oshadhaperer\AppData\Local\Programs\Python\Python311\pythonw.exe"
scriptPath = "E:\Laptop Securtiy Ai\laptopguard-ai\apps\windows\webcam_streamer.py"

Do
    ' Run pythonw silently (0 = hidden) and wait for exit (True = wait)
    WshShell.Run """" & pythonPath & """ """ & scriptPath & """", 0, True
    ' If it ever stops or crashes, wait 3 seconds and restart automatically
    WScript.Sleep 3000
Loop
