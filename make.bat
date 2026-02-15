del PeacemakerAI.wz
del "..\autoload\PeacemakerAI.wz"
powershell "Compress-Archive multiplay PeacemakerAI.zip"
move PeacemakerAI.zip PeacemakerAI.wz
copy PeacemakerAI.wz "..\autoload"
