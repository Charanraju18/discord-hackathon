import os
import re

files_to_update = [
  ('features/auth/AuthContext.tsx', 2),
  ('features/channels/ChannelSidebar.tsx', 2),
  ('features/chat/ChatArea.tsx', 2),
  ('features/servers/InviteLandingPage.tsx', 2),
  ('features/servers/InviteModal.tsx', 2),
  ('features/servers/MembersSidebar.tsx', 2),
  ('features/servers/ServerSidebar.tsx', 2),
  ('features/socket/SocketContext.tsx', 2),
  ('layouts/AppLayout.tsx', 1),
  ('pages/Login.tsx', 1),
  ('pages/Register.tsx', 1)
]

for file_path, depth in files_to_update:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}")
        continue
        
    with open(file_path, 'r') as f:
        content = f.read()
        
    if "API_BASE_URL" in content:
        continue

    content = content.replace('http://localhost:5000', '${API_BASE_URL}')
    content = content.replace("'${API_BASE_URL}", "`${API_BASE_URL}")
    content = content.replace("${API_BASE_URL}'", "${API_BASE_URL}`")
    
    import_path = '../' * depth + 'config'
    import_stmt = f"import {{ API_BASE_URL }} from '{import_path}';\n"
    
    # find last import
    imports = re.finditer(r'^import .*?;?\n', content, re.MULTILINE)
    last_import_idx = 0
    for match in imports:
        last_import_idx = match.end()
        
    content = content[:last_import_idx] + import_stmt + content[last_import_idx:]
    
    with open(file_path, 'w') as f:
        f.write(content)

print("Update complete")
